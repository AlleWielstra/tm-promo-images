const axios = require('axios');
const readExcelFile = require('read-excel-file/node');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const database = require('./database');

let processedProductsDetails = [];

// Logic4 API credentials
const clientId = 'cHidi4lPaC8gOZaz2xaSPoGe T00lM@xR0b1nHq api@toolmax.nl'; // Adjusted for privacy
const clientSecret = 'sis8SWOqi5R8GeCrIya2A30C *Hlfe+3I7o+L'; // Adjusted for privacy
let bearerToken;
let dataSet;

// Function to run a Python script and await its completion
async function runPythonScript(scriptPath, arguments = "") {
    try {
        const { stdout, stderr } = await exec(`python "${scriptPath} ${arguments}"`);
        console.log(`stdout: ${stdout}`);
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
    } catch (error) {
        console.error(`exec error: ${error}`);
    }
}

// Function to get the Logic4 bearer token
async function getLogic4BearerToken() {
    try {
        const response = await axios.post('https://idp.logic4server.nl/token', new URLSearchParams({
            'client_id': clientId,
            'client_secret': clientSecret,
            'scope': 'api administration.1',
            'grant_type': 'client_credentials'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        bearerToken = response.data.access_token;
        return bearerToken;
    } catch (error) {
        console.error('Error fetching bearer token:', error);
        throw new Error(error.response ? error.response.data : error.message);
    }
}

// Function to make API requests to Logic4
async function logic4ApiRequest(url, data, method = 'post') {
    if (!bearerToken) {
        await getLogic4BearerToken();
    }
    try {
        const config = {
            method: method,
            url: `https://api.logic4server.nl${url}`,
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            },
            data
        };

        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            await getLogic4BearerToken();
            return logic4ApiRequest(url, data, method);
        } else {
            console.error('Error in API request:', error);
            throw new Error(error.response ? error.response.data : error.message);
        }
    }
}

// Function to read product IDs from an Excel file
async function readProductIdsFromExcel(filePath) {
    try {
        const rows = await readExcelFile(filePath);
        const productIds = rows.slice(1).map(row => row[0]);
        return productIds;
    } catch (error) {
        console.error('Error reading Excel file:', error);
        throw error;
    }
}

async function downloadImage(oldImageName, imageName) {
    let targetFolder = path.join(__dirname, '/files/downloaded_images');
    const baseUrl = "https://www.toolmax.nl/files/";

    // Ensure directory exists
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
    }

    const imageUrl = `${baseUrl}${oldImageName}`;
    const filePath = path.join(targetFolder, imageName);

    try {
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading image ${imageUrl}:`, error);
        throw error;
    }
}

// Function to process and download images after getting their information
async function processAndDownloadImages(responseData) {
    let processedProducts = new Set();
    for (const image of responseData.Records) {
        let image_name = image.ProductName1;
        let oldImageName = image.Imagename1;
        let extension = "." + oldImageName.split('.')[1];
        if (image_name.length > 100) {
            image_name = image_name.substring(0, 100);
        }

        // First, perform initial clean-up by replacing spaces with dashes and removing single quotes
        let parsed_name = image_name.replace(/ /g, "-").replace(/'/g, "");

        // Then, remove all characters not allowed (keeping alphanumerics, single dashes, and dots)
        parsed_name = parsed_name.replace(/[^a-zA-Z0-9.-]/g, "");

        // Finally, address multiple consecutive dashes or dots that might have been introduced
        parsed_name = parsed_name.replace(/-+/g, "-") // Consolidate multiple dashes into one
            .replace(/\.{2,}/g, ".") // Consolidate multiple dots into one
            .replace(/^\./, "") // Remove leading dot, if any
            .replace(/\.$/, ""); // Remove trailing dot, if any

        parsed_name += "_WS" + extension;

        if (!processedProducts.has(image.ProductId)) {
            await downloadImage(oldImageName, parsed_name);
            processedProductsDetails.push({ productcode: image['ProductCode'], promoImage: parsed_name });
            console.log(processedProductsDetails);
            processedProducts.add(image.ProductId);
        }
    }
}

// Main function to get product images and download them
async function getProductImagesFromExcel(filePath) {
    try {
        const productIds = await readProductIdsFromExcel(filePath);
        const response = await logic4ApiRequest('/v1.1/Products/GetProducts', { ProductIds: productIds }, 'post');
        dataSet = response;

        await processAndDownloadImages(response);
    } catch (error) {
        console.error('Failed:', error.message);
    }
}

// New function to write data to CSV
async function writeDataToCSV() {
    const csvLines = ['productcode, promoImage'];
    database.executeQuery(`INSERT INTO 'active_images' ('product_code', 'url', 'promo') VALUES ('${detail.productcode}','${detail.promoImage}','test')`);
    processedProductsDetails.forEach(detail => {
        csvLines.push(`${detail.productcode},${detail.promoImage}`);
    });
    fs.writeFileSync('processed_products.csv', csvLines.join('\n'), 'utf8');
    console.log('CSV file has been created.');
}

// Main function to orchestrate tasks for multiple files
async function main(filePaths) {
    try {
        // Process each file concurrently
        await Promise.all(filePaths.map(async (filePath) => {
            await getProductImagesFromExcel(filePath);
        }));

        console.log('Finished downloading images.');

        // Adjust script paths as necessary
        await runPythonScript(path.join(__dirname, 'square.py'));
        console.log('Finished running square.py.');
        await runPythonScript(path.join(__dirname, 'mark.py'), arg);
        console.log('Finished running mark.py.');
        await writeDataToCSV();
        console.log('Finished writing CSV file.');
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

if (process.argv.length < 3) {
    console.log("Usage: node app.js <filename.xlsx> <Promo_Name> <PromoImageName>");
    process.exit(1);
}

const filePaths = process.argv.slice(2);
main(filePaths).catch(console.error);
