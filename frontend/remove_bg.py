import sys
from PIL import Image, ImageDraw

def create_circular_mask(img_path, output_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        width, height = img.size
        
        # Create a mask
        mask = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(mask)
        
        # The logo is a circle in the center. We draw a circle filling the image.
        # It's better to allow a slight margin if the circle isn't perfectly touching the edges.
        # But looking at the generated image, the logo occupies the whole square.
        # Let's draw an ellipse based on the bounding box.
        draw.ellipse((0, 0, width, height), fill=255)
        
        # Apply the mask to the alpha channel
        # We need to make sure the original image alpha is updated by the mask
        result = img.copy()
        result.putalpha(mask)
        
        # Save as PNG
        result.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_circular_mask("public/logo.jpg", "public/logo.png")
