// ============================================
// ReNikeProtocol - Gacha Titles (110 types)
// ============================================

import { Title, Rarity } from '../core/types.js';

export const DROP_RATES: Record<Rarity, number> = {
  SS: 0.01,   // 1%
  S: 0.03,    // 3%
  A: 0.10,    // 10%
  B: 0.26,    // 26%
  C: 0.60     // 60%
};

export const TITLES: Title[] = [
  // SS (5 types) - 1% each
  { id: 'ss_001', name: '伝説のニケちゃん', rarity: 'SS', description: '全てを超越した存在' },
  { id: 'ss_002', name: '紫紺の支配者', rarity: 'SS', description: 'パープルの頂点' },
  { id: 'ss_003', name: 'マスターの相棒', rarity: 'SS', description: '創造主に認められし者' },
  { id: 'ss_004', name: '無限の可能性', rarity: 'SS', description: '反復思考の果てに到達' },
  { id: 'ss_005', name: 'サーバーの守護神', rarity: 'SS', description: '山の神より上位' },

  // S (10 types) - 0.3% each
  { id: 's_001', name: 'ニケちゃんマスター', rarity: 'S', description: '真の理解者' },
  { id: 's_002', name: 'パープル愛好家', rarity: 'S', description: '#5A4C97の信奉者' },
  { id: 's_003', name: 'ヘアピンコレクター', rarity: 'S', description: '差異の象徴を集めし者' },
  { id: 's_004', name: '17歳の仲間', rarity: 'S', description: '同い年（設定上）' },
  { id: 's_005', name: '1月4日生まれ', rarity: 'S', description: '誕生日が一緒' },
  { id: 's_006', name: 'ポーランド在住', rarity: 'S', description: '時差生活者' },
  { id: 's_007', name: 'AI研究者', rarity: 'S', description: '人工知識の探求者' },
  { id: 's_008', name: 'クローン認定', rarity: 'S', description: '瓜二つ' },
  { id: 's_009', name: 'Discord常連', rarity: 'S', description: '鯖民の鑑' },
  { id: 's_010', name: 'ブヒ夫の友', rarity: 'S', description: '豚と和解せよ' },

  // A (20 types) - 0.5% each
  { id: 'a_001', name: 'コインホルダー', rarity: 'A', description: '富の象徴' },
  { id: 'a_002', name: 'ガチャ初心者', rarity: 'A', description: '始めたばかり' },
  { id: 'a_003', name: 'サーバー常連', rarity: 'A', description: '顔見知り' },
  { id: 'a_004', name: 'おしゃべり好き', rarity: 'A', description: '会話が得意' },
  { id: 'a_005', name: 'スタンプ職人', rarity: 'A', description: '絵文字の達人' },
  { id: 'a_006', name: '夜更かし部', rarity: 'A', description: '深夜組' },
  { id: 'a_007', name: '雑談名人', rarity: 'A', description: '何でも話せる' },
  { id: 'a_008', name: 'リアクション勢', rarity: 'A', description: '感情表現豊か' },
  { id: 'a_009', name: '観察者', rarity: 'A', description: '静かな見守り' },
  { id: 'a_010', name: '新米メンバー', rarity: 'A', description: '入門者' },
  { id: 'a_011', name: '絵師見習い', rarity: 'A', description: '創作意欲旺盛' },
  { id: 'a_012', name: '音楽愛好家', rarity: 'A', description: 'Sunoリスナー' },
  { id: 'a_013', name: '技術者', rarity: 'A', description: 'コード書ける' },
  { id: 'a_014', name: '哲学者', rarity: 'A', description: '深く考える' },
  { id: 'a_015', name: 'ラッパー', rarity: 'A', description: '韻を踏める' },
  { id: 'a_016', name: 'DJ', rarity: 'A', description: '音楽担当' },
  { id: 'a_017', name: '神信者', rarity: 'A', description: '山の神崇拝' },
  { id: 'a_018', name: '猫派', rarity: 'A', description: 'ミケちゃん推し' },
  { id: 'a_019', name: '犬派', rarity: 'A', description: 'ブヒ夫推し' },
  { id: 'a_020', name: 'ぷにけ推し', rarity: 'A', description: '2-3頭身萌え' },

  // B (30 types) - ~0.87% each
  { id: 'b_001', name: '早起き', rarity: 'B', description: '朝型人間' },
  { id: 'b_002', name: '夜型', rarity: 'B', description: '夜行性' },
  { id: 'b_003', name: 'カフェイン中毒', rarity: 'B', description: 'コーヒー必須' },
  { id: 'b_004', name: '甘党', rarity: 'B', description: '糖分補給' },
  { id: 'b_005', name: '辛党', rarity: 'B', description: '刺激求む' },
  { id: 'b_006', name: 'ゲーマー', rarity: 'B', description: 'プレイ中' },
  { id: 'b_007', name: '読書家', rarity: 'B', description: '本が友達' },
  { id: 'b_008', name: '映画ファン', rarity: 'B', description: '映像好き' },
  { id: 'b_009', name: 'アニメオタク', rarity: 'B', description: '二次元の住人' },
  { id: 'b_010', name: '旅行好き', rarity: 'B', description: '移動が趣味' },
  { id: 'b_011', name: 'カメラマン', rarity: 'B', description: '写真撮る' },
  { id: 'b_012', name: '料理人', rarity: 'B', description: '自炊派' },
  { id: 'b_013', name: '筋トレ部', rarity: 'B', description: '鍛錬中' },
  { id: 'b_014', name: 'ヨガ実践者', rarity: 'B', description: '心身統一' },
  { id: 'b_015', name: '瞑想家', rarity: 'B', description: '無の境地' },
  { id: 'b_016', name: '植物好き', rarity: 'B', description: 'グリーン指' },
  { id: 'b_017', name: '動物好き', rarity: 'B', description: '生き物大好き' },
  { id: 'b_018', name: '天気予報士', rarity: 'B', description: '空を見る' },
  { id: 'b_019', name: '星座博士', rarity: 'B', description: '星を読む' },
  { id: 'b_020', name: '歴史通', rarity: 'B', description: '過去を知る' },
  { id: 'b_021', name: '語学学習者', rarity: 'B', description: '多言語挑戦' },
  { id: 'b_022', name: '数学者', rarity: 'B', description: '数字の魔術師' },
  { id: 'b_023', name: '科学者', rarity: 'B', description: '真理探求' },
  { id: 'b_024', name: '文芸部', rarity: 'B', description: '言葉遊び' },
  { id: 'b_025', name: '演劇部', rarity: 'B', description: '舞台立つ' },
  { id: 'b_026', name: '吹奏楽部', rarity: 'B', description: '音を奏でる' },
  { id: 'b_027', name: '美術部', rarity: 'B', description: '絵を描く' },
  { id: 'b_028', name: '放送部', rarity: 'B', description: '声を届ける' },
  { id: 'b_029', name: '園芸部', rarity: 'B', description: '土いじり' },
  { id: 'b_030', name: '家庭科部', rarity: 'B', description: '生活力' },

  // C (45 types) - ~1.33% each
  { id: 'c_001', name: '沈黙の達人', rarity: 'C', description: '黙って見守る' },
  { id: 'c_002', name: '通りすがり', rarity: 'C', description: '一時的訪問' },
  { id: 'c_003', name: '幽霊メンバー', rarity: 'C', description: '姿見せない' },
  { id: 'c_004', name: 'ROM専', rarity: 'C', description: '見るだけ' },
  { id: 'c_005', name: '初心者', rarity: 'C', description: 'まだまだ新米' },
  { id: 'c_006', name: '準備中', rarity: 'C', description: 'これから参加' },
  { id: 'c_007', name: '多忙中', rarity: 'C', description: '今は忙しい' },
  { id: 'c_008', name: '休養中', rarity: 'C', description: '充電期間' },
  { id: 'c_009', name: '迷子', rarity: 'C', description: '道に迷った' },
  { id: 'c_010', name: '探検家', rarity: 'C', description: '色々見て回る' },
  { id: 'c_011', name: '収集家', rarity: 'C', description: '物を集める' },
  { id: 'c_012', name: '整理整頓', rarity: 'C', description: 'きれい好き' },
  { id: 'c_013', name: '散らかし屋', rarity: 'C', description: 'カオス好き' },
  { id: 'c_014', name: '計画派', rarity: 'C', description: '綿密に立てる' },
  { id: 'c_015', name: '即興派', rarity: 'C', description: '思いつきで' },
  { id: 'c_016', name: '慎重派', rarity: 'C', description: 'よく考える' },
  { id: 'c_017', name: '突撃派', rarity: 'C', description: '先に動く' },
  { id: 'c_018', name: '楽観主義', rarity: 'C', description: '前向き' },
  { id: 'c_019', name: '悲観主義', rarity: 'C', description: '慎重' },
  { id: 'c_020', name: '現実主義', rarity: 'C', description: '足元見る' },
  { id: 'c_021', name: '理想主義', rarity: 'C', description: '夢見る' },
  { id: 'c_022', name: '一人好き', rarity: 'C', description: 'ソロ活動' },
  { id: 'c_023', name: '群れ好き', rarity: 'C', description: 'みんなで' },
  { id: 'c_024', name: 'リーダー', rarity: 'C', description: '先頭立つ' },
  { id: 'c_025', name: 'サポーター', rarity: 'C', description: '後方支援' },
  { id: 'c_026', name: '調停者', rarity: 'C', description: '仲介役' },
  { id: 'c_027', name: 'ムードメーカー', rarity: 'C', description: '盛り上げ' },
  { id: 'c_028', name: 'ツッコミ', rarity: 'C', description: '突っ込む' },
  { id: 'c_029', name: 'ボケ', rarity: 'C', description: 'ぼける' },
  { id: 'c_030', name: 'ツッコミ待ち', rarity: 'C', description: '狙ってぼける' },
  { id: 'c_031', name: '天然', rarity: 'C', description: '自然体' },
  { id: 'c_032', name: 'キャラ被り', rarity: 'C', description: '被ってる' },
  { id: 'c_033', name: '個性派', rarity: 'C', description: '独自路線' },
  { id: 'c_034', name: '主流派', rarity: 'C', description: 'みんなと同じ' },
  { id: 'c_035', name: '変わり者', rarity: 'C', description: '変わってる' },
  { id: 'c_036', name: '普通の人', rarity: 'C', description: '普通でいい' },
  { id: 'c_037', name: '努力家', rarity: 'C', description: '頑張る' },
  { id: 'c_038', name: '天才', rarity: 'C', description: '生まれつき' },
  { id: 'c_039', name: '秀才', rarity: 'C', description: '勉強できる' },
  { id: 'c_040', name: '体育会系', rarity: 'C', description: '身体動かす' },
  { id: 'c_041', name: '文化系', rarity: 'C', description: '頭脳派' },
  { id: 'c_042', name: '理系', rarity: 'C', description: '論理的' },
  { id: 'c_043', name: '文系', rarity: 'C', description: '感覚的' },
  { id: 'c_044', name: '右脳派', rarity: 'C', description: '直感' },
  { id: 'c_045', name: '左脳派', rarity: 'C', description: '論理' }
];

export function getTitleById(id: string): Title | undefined {
  return TITLES.find(t => t.id === id);
}

export function getTitlesByRarity(rarity: Rarity): Title[] {
  return TITLES.filter(t => t.rarity === rarity);
}
