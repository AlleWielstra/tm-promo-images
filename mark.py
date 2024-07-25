from PIL import Image, ImageDraw
import os
import sys

def add_watermark_with_percentage_control(folder_path, watermark_path, watermark_scale_percentage, watermark_margin_percentage, white_space_right_percentage, white_space_bottom_percentage):
    """
    Adds a watermark to the original image, allowing it to overlap both the image and the added white space,
    with all margins and white space sizes defined as percentages of the original image's dimensions.

    Parameters:
    - folder_path: Path to the folder containing images to be watermarked.
    - watermark_path: Path to the watermark image.
    - watermark_scale_percentage: The scale of the watermark relative to the shorter side of the original image, as a percentage.
    - watermark_margin_percentage: Margin between the watermark and the edges of the original image, as a percentage of the image's dimensions.
    - white_space_right_percentage: Additional white space to add to the right of the original image, as a percentage of the image's width.
    - white_space_bottom_percentage: Additional white space to add to the bottom of the original image, as a percentage of the image's height.
    """
    # Load the watermark image
    watermark = Image.open(watermark_path)

    for filename in os.listdir(folder_path):
        if filename.endswith(('.png', '.jpg', '.jpeg')):
            original_image_path = os.path.join(folder_path, filename)
            original_image = Image.open(original_image_path)
            original_width, original_height = original_image.size

            # Calculate dimensions for white space based on percentage values
            white_space_right = int(original_width * white_space_right_percentage / 100)
            white_space_bottom = int(original_height * white_space_bottom_percentage / 100)

            # Determine scale factor for the watermark based on the original image size
            shorter_side = min(original_width, original_height)
            watermark_new_size = int(shorter_side * watermark_scale_percentage / 100)
            aspect_ratio = watermark.width / watermark.height
            watermark_new_height = int(watermark_new_size / aspect_ratio)
            watermark_resized = watermark.resize((watermark_new_size, watermark_new_height))

            # Calculate new image dimensions to include the additional white space
            new_image_width = original_width + white_space_right
            new_image_height = original_height + white_space_bottom

            # Create a new image with white background
            new_image = Image.new('RGBA', (new_image_width, new_image_height), "WHITE")
            new_image.paste(original_image, (0, 0))
            # # Create gradient
            # gradient = Image.new('RGBA', (new_image_width, white_space_bottom + 50), color=0)
            # draw = ImageDraw.Draw(gradient)
            # for i in range(white_space_bottom):
            #     alpha = int(255 * (i / white_space_bottom))  # Flipped alpha calculation
            #     draw.line((0, i, new_image_width, i), fill=(0, 0, 0, 150 - alpha))

            # # Apply gradient to the new image
            # new_image.paste(gradient, (0, original_height), gradient)
            # Calculate watermark position with specified margins
            watermark_margin_right = int(original_width * watermark_margin_percentage / 100)
            watermark_margin_bottom = int(original_height * watermark_margin_percentage / 100)
            watermark_position = (new_image_width - watermark_new_size - watermark_margin_right,
                                  new_image_height - watermark_new_height - watermark_margin_bottom)
            # Paste the watermark onto the new canvas
            new_image.paste(watermark_resized, watermark_position, watermark_resized if watermark_resized.mode == 'RGBA' else None)

            # Save the modified image with a new filename
            new_filename = f"{filename}"
            new_image_path = os.path.join('./files/finished_images/', new_filename)
            new_image.save(new_image_path, "PNG")  # PNG to keep the background transparent
            print(f"Added watermark to {new_filename}")

folder_path = './files/squared_images/'
watermark_path = './' + sys.argv[1]
add_watermark_with_percentage_control(folder_path, watermark_path, watermark_scale_percentage=50, watermark_margin_percentage=0, white_space_right_percentage=10, white_space_bottom_percentage=5)
