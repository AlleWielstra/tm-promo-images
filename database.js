var mysql = require('mysql2');
const fs = require('fs'); // Import the fs module

class DbMysql {
    constructor() {
        this.pool = mysql.createPool({
            host     : 'localhost',
            user     : 'root',
            password : '', // or your root password if you have set one
            database : 'promo_images',
            connectTimeout: 10000
        });
    }
    executeQuery(sql) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if(err) {
                    this.logError(err); // Log the error
                    reject(err);
                    return;
                }
                connection.query(sql, (error, results, fields) => {
                    connection.release(); // When done with the connection, release it.
                    if (error) {
                        this.logError(error); // Log the error
                        reject(error);
                        return;
                    }
                    resolve(results);
                });
            });
        });
    }
}

module.exports = new DbMysql;