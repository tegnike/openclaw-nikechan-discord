#!/usr/bin/env python3
"""
Print Preview - RGB to CMYK Simulation Web UI
"""

from flask import Flask, render_template, request, send_file, jsonify
import os
import uuid
import subprocess
from pathlib import Path

app = Flask(__name__)
UPLOAD_DIR = Path("uploads")
PREVIEW_DIR = Path("previews")
UPLOAD_DIR.mkdir(exist_ok=True)
PREVIEW_DIR.mkdir(exist_ok=True)

# ICC Profiles configuration
PROFILES = {
    "cmyk_standard": {
        "name": "標準CMYK (JapanColor2001)",
        "cmyk": "JapanColor2001Coated.icc",
        "rgb": "sRGB.icc"
    },
    "printful": {
        "name": "Printful推奨設定",
        "cmyk": None,  # Use generic simulation
        "quality": 85
    },
    "suzuri": {
        "name": "SUZURI推奨設定", 
        "cmyk": None,
        "quality": 90
    }
}

@app.route("/")
def index():
    return render_template("index.html", profiles=PROFILES)

@app.route("/upload", methods=["POST"])
def upload():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files["image"]
    profile_key = request.form.get("profile", "cmyk_standard")
    
    img_id = str(uuid.uuid4())[:8]
    ext = file.filename.split(".")[-1].lower()
    input_path = UPLOAD_DIR / f"{img_id}_input.{ext}"
    output_path = PREVIEW_DIR / f"{img_id}_preview.jpg"
    
    file.save(input_path)
    
    # Convert using ImageMagick
    try:
        convert_image(str(input_path), str(output_path), profile_key)
        return jsonify({
            "id": img_id,
            "original": f"/original/{img_id}",
            "preview": f"/preview/{img_id}",
            "profile": PROFILES[profile_key]["name"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def convert_image(input_path, output_path, profile_key):
    """Convert RGB to CMYK simulation"""
    profile = PROFILES[profile_key]
    
    if profile_key == "cmyk_standard":
        # Full ICC profile conversion
        cmd = [
            "convert", input_path,
            "-profile", profile["rgb"],
            "-profile", profile["cmyk"],
            "-profile", profile["rgb"],  # Back to RGB for display
            "-quality", "95",
            output_path
        ]
    else:
        # Simple CMYK color space simulation
        cmd = [
            "convert", input_path,
            "-colorspace", "CMYK",
            "-colorspace", "sRGB",
            "-quality", str(profile.get("quality", 90)),
            output_path
        ]
    
    subprocess.run(cmd, check=True)

@app.route("/original/<img_id>")
def get_original(img_id):
    for f in UPLOAD_DIR.glob(f"{img_id}_input.*"):
        return send_file(f)
    return "Not found", 404

@app.route("/preview/<img_id>")
def get_preview(img_id):
    path = PREVIEW_DIR / f"{img_id}_preview.jpg"
    if path.exists():
        return send_file(path)
    return "Not found", 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
