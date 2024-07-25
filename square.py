import os
from PIL import Image

def make_image_square_and_replace_transparency(image_path, output_path):
    with Image.open(image_path) as image:
        # Convert palette images with transparency to RGBA
        if image.mode == 'P' and 'transparency' in image.info:
            image = image.convert('RGBA')

        # Check if the image has an alpha channel and convert to RGBA if necessary
        if image.mode in ('RGBA', 'LA'):
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])  # Use the alpha channel as the mask
            image = background
        elif image.mode == 'P':  # Additional check if the image mode is still 'P'
            image = image.convert('RGBA')

        # Calculate the size to make the image square
        max_size = max(image.size)
        new_image = Image.new("RGB", (max_size, max_size), (255, 255, 255))
        x = (max_size - image.width) // 2
        y = (max_size - image.height) // 2
        new_image.paste(image, (x, y))

        # Save the modified image
        new_image.save(output_path, "PNG")

def process_folder(folder_path) :
    output_folder = os.path.join(folder_path, "../files/squared_images")
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
            file_path = os.path.join(folder_path, filename)
            output_path = os.path.join(output_folder, f"{filename}")
            make_image_square_and_replace_transparency(file_path, output_path)
            print(f"Processed {filename}")

if __name__ == "__main__":
    folder_path = "./files/downloaded_images/"
    if os.path.isdir(folder_path):
        process_folder(folder_path)
        print("All images have been processed.")
    else:
        print("The provided path does not exist or is not a directory.")