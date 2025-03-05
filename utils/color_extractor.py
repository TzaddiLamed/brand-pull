import numpy as np
from sklearn.cluster import KMeans
from PIL import Image
import colorsys

def extract_colors(image_path, num_colors=5):
    # Load image
    image = Image.open(image_path).convert('RGBA')
    
    # Create a white background
    background = Image.new('RGBA', image.size, (255, 255, 255))
    
    # Paste the image on the background
    composite = Image.alpha_composite(background, image).convert('RGB')
    
    # Resize for faster processing
    img_resized = composite.resize((150, 150))
    
    # Convert to numpy array
    img_array = np.array(img_resized)
    
    # Reshape for k-means
    pixels = img_array.reshape(-1, 3)
    
    # Apply k-means clustering
    kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
    kmeans.fit(pixels)
    colors = kmeans.cluster_centers_
    
    # Count occurrences of each cluster
    labels = kmeans.labels_
    counts = np.bincount(labels)
    
    # Sort colors by count (most common first)
    colors_count = list(zip(colors, counts))
    colors_count.sort(key=lambda x: x[1], reverse=True)
    
    # Convert to integers (0-255)
    colors = [color[0].astype(int) for color in colors_count]
    
    # Calculate percentages
    total_pixels = sum(counts)
    percentages = [(count / total_pixels) * 100 for color, count in colors_count]
    
    # Get color names (approximation)
    color_names = [get_color_name(color) for color in colors]
    
    # Convert to hex, RGB and CMYK and create response
    result = []
    for i, color in enumerate(colors):
        r, g, b = color
        hex_code = '#{:02x}{:02x}{:02x}'.format(r, g, b)
        rgb = f'rgb({r}, {g}, {b})'
        
        # Convert RGB to CMYK
        r_norm, g_norm, b_norm = r/255, g/255, b/255
        k = 1 - max(r_norm, g_norm, b_norm)
        
        # Avoid division by zero
        if k == 1:
            c, m, y = 0, 0, 0
        else:
            c = (1 - r_norm - k) / (1 - k)
            m = (1 - g_norm - k) / (1 - k)
            y = (1 - b_norm - k) / (1 - k)
        
        # Convert to percentages
        c = round(c * 100)
        m = round(m * 100)
        y = round(y * 100)
        k = round(k * 100)
        
        cmyk = f'cmyk({c}%, {m}%, {y}%, {k}%)'
        
        result.append({
            'hex': hex_code,
            'rgb': rgb,
            'rgb_values': color.tolist(),
            'cmyk': cmyk,
            'cmyk_values': [c, m, y, k],
            'percentage': round(percentages[i], 1),
            'color_name': color_names[i]
        })
    
    return result

def get_color_name(rgb):
    """Simple color naming function"""
    r, g, b = rgb
    
    # Convert to HSV
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    
    # Gray detection
    if s < 0.1:
        if v < 0.2:
            return "Black"
        elif v < 0.5:
            return "Dark Gray"
        elif v < 0.8:
            return "Gray"
        else:
            return "White"
    
    # Color determination based on hue
    h *= 360  # Convert to 0-360 range
    
    if h < 30:
        return "Red" if s > 0.6 else "Brown"
    elif h < 90:
        return "Orange" if h < 50 else "Yellow"
    elif h < 150:
        return "Green"
    elif h < 210:
        return "Cyan" 
    elif h < 270:
        return "Blue"
    elif h < 330:
        return "Purple"
    else:
        return "Pink" if v > 0.8 else "Red"
