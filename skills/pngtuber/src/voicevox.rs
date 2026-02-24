use anyhow::{Context, Result};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::io::Cursor;

// ずんだもん（ノーマル）の話者ID
const ZUNDA_MON_ID: u32 = 3;
const VOICEVOX_BASE: &str = "http://localhost:50021";

#[derive(Debug)]
pub struct VoiceVox {
    client: Client,
    speaker_id: u32,
}

#[derive(Debug, Deserialize)]
struct Speaker {
    name: String,
    speaker_uuid: String,
    styles: Vec<Style>,
}

#[derive(Debug, Deserialize)]
struct Style {
    id: u32,
    name: String,
}

impl VoiceVox {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            speaker_id: ZUNDA_MON_ID, // ずんだもん（ノーマル）
        }
    }

    /// 話者リストを取得
    pub fn get_speakers(&self) -> Result<Vec<(u32, String)>> {
        let url = format!("{}/speakers", VOICEVOX_BASE);
        let response = self.client.get(&url).send()?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "VOICEVOXが起動していない可能性があります: {}",
                response.status()
            ));
        }
        
        let speakers: Vec<Speaker> = response.json()?;
        let mut result = Vec::new();
        
        for speaker in speakers {
            for style in speaker.styles {
                result.push((style.id, format!("{} {}", speaker.name, style.name)));
            }
        }
        
        Ok(result)
    }

    /// テキストを音声合成してWAVデータを返す
    pub fn synthesize(&self, text: &str) -> Result<Vec<u8>> {
        // 1. テキストからアクセント句を生成
        let query_url = format!("{}/audio_query", VOICEVOX_BASE);
        let query_response = self
            .client
            .post(&query_url)
            .query(&[("text", text), ("speaker", &self.speaker_id.to_string())])
            .send()?;
        
        if !query_response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Audio query failed: {}",
                query_response.status()
            ));
        }
        
        let audio_query: serde_json::Value = query_response.json()?;
        
        // 2. アクセント句から音声を合成
        let synthesis_url = format!("{}/synthesis", VOICEVOX_BASE);
        let synthesis_response = self
            .client
            .post(&synthesis_url)
            .query(&[("speaker", &self.speaker_id.to_string())])
            .json(&audio_query)
            .send()?;
        
        if !synthesis_response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Synthesis failed: {}",
                synthesis_response.status()
            ));
        }
        
        let wav_data = synthesis_response.bytes()?.to_vec();
        Ok(wav_data)
    }

    /// 話者IDを設定
    pub fn set_speaker(&mut self, speaker_id: u32) {
        self.speaker_id = speaker_id;
    }
}

/// WAVデータから音量レベルを計算（口パク用）
pub fn calculate_volume_levels(wav_data: &[u8], sample_count: usize) -> Vec<f32> {
    // WAVヘッダーをスキップ（44バイト）
    let data_start = 44.min(wav_data.len());
    let samples: &[i16] = bytemuck::cast_slice(&wav_data[data_start..]);
    
    let samples_per_chunk = samples.len() / sample_count;
    let mut levels = Vec::with_capacity(sample_count);
    
    for i in 0..sample_count {
        let start = i * samples_per_chunk;
        let end = ((i + 1) * samples_per_chunk).min(samples.len());
        
        if start < samples.len() {
            let chunk = &samples[start..end];
            let rms = (chunk.iter().map(|&s| s as f32 * s as f32).sum::<f32>() 
                      / chunk.len() as f32).sqrt();
            levels.push(rms / 32768.0); // 正規化
        } else {
            levels.push(0.0);
        }
    }
    
    levels
}
