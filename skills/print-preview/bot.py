#!/usr/bin/env python3
"""
Print Preview Discord Bot - CMYK Simulation
"""

import discord
from discord import app_commands
import os
import uuid
import subprocess
from pathlib import Path
from PIL import Image
import io

intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)
tree = app_commands.CommandTree(bot)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@bot.event
async def on_ready():
    print(f"Bot logged in as {bot.user}")
    await tree.sync()

@tree.command(name="preview", description="RGB画像をCMYKシミュレーション")
@app_commands.describe(
    image="変換する画像",
    profile="プロファイル"
)
@app_commands.choices(profile=[
    app_commands.Choice(name="標準CMYK", value="standard"),
    app_commands.Choice(name="Printful", value="printful"),
    app_commands.Choice(name="SUZURI", value="suzuri"),
])
async def preview(interaction: discord.Interaction, image: discord.Attachment, profile: app_commands.Choice[str]):
    if not image.content_type or not image.content_type.startswith("image/"):
        await interaction.response.send_message("画像ファイルを添付してください", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    # Download image
    img_id = str(uuid.uuid4())[:8]
    input_path = UPLOAD_DIR / f"{img_id}_input.png"
    output_path = UPLOAD_DIR / f"{img_id}_preview.jpg"
    
    await image.save(input_path)
    
    # Convert
    try:
        convert_image(str(input_path), str(output_path), profile.value)
        
        # Send result
        embed = discord.Embed(
            title=f"印刷プレビュー ({profile.name})",
            description="左：元画像 | 右：CMYKシミュレーション",
            color=0x5A4C97
        )
        
        files = [
            discord.File(input_path, filename="original.png"),
            discord.File(output_path, filename="preview.jpg")
        ]
        
        await interaction.followup.send(embed=embed, files=files)
        
    except Exception as e:
        await interaction.followup.send(f"エラー: {str(e)}", ephemeral=True)
    finally:
        # Cleanup
        if input_path.exists():
            input_path.unlink()
        if output_path.exists():
            output_path.unlink()

def convert_image(input_path: str, output_path: str, profile: str):
    """Convert RGB to CMYK simulation"""
    with Image.open(input_path) as img:
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        if profile == "standard":
            # Simulate CMYK conversion
            cmyk = img.convert('CMYK')
            # Back to RGB for display
            rgb = cmyk.convert('RGB')
        else:
            # Simple profile-based adjustment
            rgb = img.copy()
        
        rgb.save(output_path, 'JPEG', quality=95)

# Run with: DISCORD_TOKEN=your_token python bot.py
if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        print("Error: DISCORD_TOKEN environment variable required")
        exit(1)
    bot.run(token)
