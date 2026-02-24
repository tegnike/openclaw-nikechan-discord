use eframe::egui;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

// DiscordスタンプURL
const AVATAR_URLS: &[(&str, &str)] = &[
    ("normal", "https://cdn.discordapp.com/emojis/1473092441107202120.png"),
    ("happy", "https://cdn.discordapp.com/emojis/1472503800974803049.png"),
    ("surprise", "https://cdn.discordapp.com/emojis/1473092191885852885.png"),
    ("sleepy", "https://cdn.discordapp.com/emojis/1472230286409335073.png"),
];

struct PNGTuber {
    volume: Arc<Mutex<f32>>,
    images: HashMap<String, egui::TextureHandle>,
    current_state: String,
}

impl PNGTuber {
    fn new(cc: &eframe::CreationContext<'_>, volume: Arc<Mutex<f32>>) -> Self {
        // 画像をロード
        let mut images = HashMap::new();
        
        for (state, url) in AVATAR_URLS {
            if let Ok(texture) = load_image(&cc.egui_ctx, state, url) {
                images.insert(state.to_string(), texture);
            }
        }
        
        Self {
            volume,
            images,
            current_state: "normal".to_string(),
        }
    }
    
    fn update_state(&mut self) {
        let vol = *self.volume.lock().unwrap();
        
        self.current_state = if vol < 0.1 {
            "normal"
        } else if vol < 0.3 {
            "happy"
        } else if vol < 0.6 {
            "surprise"
        } else {
            "sleepy"
        }.to_string();
    }
}

fn load_image(ctx: &egui::Context, name: &str, url: &str) -> Result<egui::TextureHandle, Box<dyn std::error::Error>> {
    // ダミー実装：色付き矩形を生成
    let size = 256;
    let mut pixels = Vec::with_capacity(size * size * 4);
    
    let color = match name {
        "normal" => [90, 76, 151, 255],   // パープル
        "happy" => [255, 200, 100, 255],  // オレンジ
        "surprise" => [100, 200, 255, 255], // ブルー
        "sleepy" => [150, 150, 150, 255], // グレー
        _ => [200, 200, 200, 255],
    };
    
    for _ in 0..(size * size) {
        pixels.extend_from_slice(&color);
    }
    
    let image = egui::ColorImage::from_rgba_unmultiplied([size, size], &pixels);
    Ok(ctx.load_texture(name, image, egui::TextureOptions::default()))
}

impl eframe::App for PNGTuber {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.update_state();
        
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("PNG Tuber - ニケちゃん");
            
            // 現在の画像を表示
            if let Some(texture) = self.images.get(&self.current_state) {
                ui.image(texture);
            }
            
            // 音量バー
            let vol = *self.volume.lock().unwrap();
            ui.add(egui::ProgressBar::new(vol).text(format!("Volume: {:.2}", vol)));
            
            ui.label(format!("State: {}", self.current_state));
            
            // デモ用スライダー
            ui.separator();
            ui.label("Demo Mode (マイクなし時用)");
            if ui.button("Auto Demo").clicked() {
                // デモモード切り替え
            }
        });
        
        // 60FPSで更新
        ctx.request_repaint_after(std::time::Duration::from_millis(16));
    }
}

fn main() -> anyhow::Result<()> {
    println!("Starting PNG Tuber...");
    
    let volume = Arc::new(Mutex::new(0.0f32));
    let volume_for_audio = volume.clone();
    
    // 音声入力スレッド（デモ用に自動変化）
    std::thread::spawn(move || {
        let mut t = 0.0f32;
        loop {
            // デモ：サイン波で音量変化
            let v = ((t.sin() + 1.0) / 2.0 * 0.8).clamp(0.0, 1.0);
            *volume_for_audio.lock().unwrap() = v;
            t += 0.05;
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
    });
    
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([400.0, 500.0]),
        ..Default::default()
    };
    
    eframe::run_native(
        "PNG Tuber",
        options,
        Box::new(|cc| Ok(Box::new(PNGTuber::new(cc, volume)))),
    )?;
    
    Ok(())
}
