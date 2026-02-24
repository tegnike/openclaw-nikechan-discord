#!/usr/bin/env python3
"""
PNG Tuber - マイク入力で表情が変わる簡易アバター
Discordスタンプ画像を使用
"""

import cv2
import numpy as np
import pyaudio
import threading
import requests
from io import BytesIO
from PIL import Image

# DiscordスタンプURL（一時的に直接指定）
AVATAR_URLS = {
    "normal": "https://cdn.discordapp.com/emojis/1473092441107202120.png",  # punike
    "happy": "https://cdn.discordapp.com/emojis/1472503800974803049.png",   # love
    "surprise": "https://cdn.discordapp.com/emojis/1473092191885852885.png", # surprise
    "sleepy": "https://cdn.discordapp.com/emojis/1472230286409335073.png",  # supiki
}

class PNGTuber:
    def __init__(self):
        self.volume = 0
        self.current_state = "normal"
        self.running = False
        self.images = {}
        
    def load_images(self):
        """Discordスタンプをダウンロードして読み込む"""
        print("Loading avatar images...")
        for state, url in AVATAR_URLS.items():
            try:
                response = requests.get(url)
                img = Image.open(BytesIO(response.content))
                # OpenCV形式に変換
                img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2BGRA)
                self.images[state] = img_cv
                print(f"  Loaded {state}: {img_cv.shape}")
            except Exception as e:
                print(f"  Failed to load {state}: {e}")
                # フォールバック: 色付き矩形
                self.images[state] = self.create_fallback()
    
    def create_fallback(self):
        """画像読み込み失敗時のフォールバック"""
        img = np.zeros((512, 512, 4), dtype=np.uint8)
        img[:, :, 3] = 255  # アルファチャンネル
        # 紫色の円
        center = (256, 256)
        radius = 200
        color = (151, 76, 90, 255)  # BGRA (パープルっぽい)
        cv2.circle(img, center, radius, color, -1)
        return img
    
    def audio_callback(self, in_data, frame_count, time_info, status):
        """マイク入力コールバック"""
        audio_data = np.frombuffer(in_data, dtype=np.int16)
        # 音量計算（RMS）
        rms = np.sqrt(np.mean(audio_data.astype(np.float32)**2))
        self.volume = min(rms / 1000, 1.0)  # 正規化
        return (in_data, pyaudio.paContinue)
    
    def start_audio(self):
        """マイク入力開始"""
        self.audio = pyaudio.PyAudio()
        self.stream = self.audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=44100,
            input=True,
            frames_per_buffer=1024,
            stream_callback=self.audio_callback
        )
        self.stream.start_stream()
        print("Audio started")
    
    def update_state(self):
        """音量に応じて状態更新"""
        if self.volume < 0.1:
            self.current_state = "normal"
        elif self.volume < 0.3:
            self.current_state = "happy"
        elif self.volume < 0.6:
            self.current_state = "surprise"
        else:
            self.current_state = "sleepy"
    
    def run(self):
        """メインループ"""
        self.load_images()
        
        try:
            self.start_audio()
        except Exception as e:
            print(f"Audio error: {e}")
            print("Running without audio (auto-demo mode)")
            self.demo_mode = True
        
        print("Starting PNG Tuber...")
        print("Press 'q' to quit")
        
        self.running = True
        frame_count = 0
        
        while self.running:
            # デモモード: 自動で音量変化
            if hasattr(self, 'demo_mode') and self.demo_mode:
                import math
                self.volume = abs(math.sin(frame_count * 0.05)) * 0.8
            
            self.update_state()
            
            # 現在の画像を取得
            img = self.images.get(self.current_state, self.images["normal"])
            
            # リサイズして表示
            display_img = cv2.resize(img, (512, 512))
            
            # 音量バーを追加
            bar_height = int(self.volume * 100)
            cv2.rectangle(display_img, (10, 400), (40, 500), (50, 50, 50, 255), -1)
            cv2.rectangle(display_img, (10, 500-bar_height), (40, 500), (0, 255, 0, 255), -1)
            
            # 状態表示
            cv2.putText(display_img, f"State: {self.current_state}", (60, 450),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255, 255), 2)
            cv2.putText(display_img, f"Volume: {self.volume:.2f}", (60, 480),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255, 255), 2)
            
            cv2.imshow("PNG Tuber", display_img)
            
            if cv2.waitKey(30) & 0xFF == ord('q'):
                self.running = False
            
            frame_count += 1
        
        self.cleanup()
    
    def cleanup(self):
        """後片付け"""
        if hasattr(self, 'stream'):
            self.stream.stop_stream()
            self.stream.close()
        if hasattr(self, 'audio'):
            self.audio.terminate()
        cv2.destroyAllWindows()
        print("PNG Tuber stopped")

if __name__ == "__main__":
    tuber = PNGTuber()
    tuber.run()
