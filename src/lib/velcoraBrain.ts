export interface TelemetryLog {
  id: string;
  timestamp: string;
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  engine: string;
  stylePreset?: string;
  seed: number;
  durationSec: number;
  resolution: string;
  aspectRatio: string;
  type: 'image' | 'video';
  outputUrl: string;
  rating?: 'up' | 'down' | null;
  status?: 'keep' | 'discard' | 'edited' | null;
  editedPrompt?: string;
}

export interface EngineConfig {
  id: string;
  name: string;
  description: string;
  baseUrl?: string;
  modelName?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  active: boolean;
}

export interface LoraAdapter {
  id: string;
  name: string;
  url: string;
  triggerWord: string;
  scale: number;
  active: boolean;
}

export interface LoraTrainingConfig {
  triggerWord: string;
  baseModel: 'SDXL 1.0' | 'FLUX.1-dev' | 'Wan 2.1 Video';
  rank: number;
  alpha: number;
  steps: number;
  learningRate: string;
  huggingFaceRepo: string;
  webhookUrl: string;
  hfToken?: string;
}

const DEFAULT_ENGINES: EngineConfig[] = [
  { id: 'engine_fast_draft', name: 'Fast Draft Engine', description: 'Low-latency, fast iteration previews. Optimized for ideation.', active: true },
  { id: 'engine_ultra_photoreal', name: 'Ultra Photorealism', description: 'High-fidelity generative image pipeline. Production ready textures.', active: true },
  { id: 'engine_cinematic_motion', name: 'Cinematic Motion', description: 'Keyframe animation and fluid video rendering pipeline.', active: true },
  { id: 'engine_custom_remote', name: 'Custom GPU Server', description: 'Configure custom base URL, model name, and custom headers/API keys.', baseUrl: 'https://api.runpod.ai/v1/custom-model', modelName: 'sdxl-or-veo-custom', apiKey: '', customHeaders: {}, active: false }
];

export const loadEngines = (): EngineConfig[] => {
  try {
    const saved = localStorage.getItem('velcora_engines');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading engines', e);
  }
  return DEFAULT_ENGINES;
};

export const saveEngines = (engines: EngineConfig[]) => {
  try {
    localStorage.setItem('velcora_engines', JSON.stringify(engines));
  } catch (e) {
    console.error('Error saving engines', e);
  }
};

export const loadTelemetryLogs = (): TelemetryLog[] => {
  try {
    const saved = localStorage.getItem('velcora_brain_telemetry');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading telemetry', e);
  }
  return [];
};

export const saveTelemetryLogs = (logs: TelemetryLog[]) => {
  try {
    localStorage.setItem('velcora_brain_telemetry', JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving telemetry', e);
  }
};

export const loadLoraAdapters = (): LoraAdapter[] => {
  try {
    const saved = localStorage.getItem('velcora_lora_adapters');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading LoRA adapters', e);
  }
  // Provide sample active adapter
  return [
    {
      id: 'lora-01',
      name: 'Ultra-Gloss Product Polish',
      url: 'https://huggingface.co/velcora/product-polish-v1/resolve/main/pytorch_lora_weights.safetensors',
      triggerWord: 'velcora_style',
      scale: 0.8,
      active: true
    }
  ];
};

export const saveLoraAdapters = (adapters: LoraAdapter[]) => {
  try {
    localStorage.setItem('velcora_lora_adapters', JSON.stringify(adapters));
  } catch (e) {
    console.error('Error saving LoRA adapters', e);
  }
};

/**
 * Aggregates highly rated generations into a downloadable JSONL dataset
 */
export const exportDatasetAsJSONL = (logs: TelemetryLog[]) => {
  // Filter for positive feedback (Thumbs up or "keep" status)
  const highRated = logs.filter(log => log.rating === 'up' || log.status === 'keep');
  
  if (highRated.length === 0) {
    return { success: false, message: 'No high-rated training samples found yet. Rate some outputs with Thumbs Up or Keep!' };
  }

  const lines = highRated.map(log => {
    return JSON.stringify({
      prompt: log.prompt,
      enhanced_prompt: log.enhancedPrompt || '',
      negative_prompt: log.negativePrompt || '',
      engine: log.engine,
      style_preset: log.stylePreset || '',
      seed: log.seed,
      resolution: log.resolution,
      aspect_ratio: log.aspectRatio,
      type: log.type,
      output_url: log.outputUrl,
      feedback_rating: log.rating || 'neutral',
      user_status: log.status || 'saved',
      edited_prompt: log.editedPrompt || undefined,
      timestamp: log.timestamp
    });
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'application/x-jsonlines;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `velcora_brain_dataset_${Date.now()}.jsonl`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, count: highRated.length };
};

/**
 * Generates an auto-executing Python notebook/script for Google Colab or Kaggle
 */
export const generateColabKagglePayload = (logs: TelemetryLog[], config: LoraTrainingConfig) => {
  const datasetSamples = logs.map((log, index) => {
    const rawCaption = log.editedPrompt || log.enhancedPrompt || log.prompt;
    // Prefix with trigger word if not already present
    const caption = rawCaption.toLowerCase().includes(config.triggerWord.toLowerCase())
      ? rawCaption
      : `${config.triggerWord}, ${rawCaption}`;

    return {
      id: index,
      url: log.outputUrl,
      caption: caption.replace(/"/g, '\\"')
    };
  });

  const isFlux = config.baseModel.startsWith('FLUX');
  const isVideo = config.baseModel.startsWith('Wan');
  
  let pythonScript = `#!/usr/bin/env python3
"""
Velcora Brain Autogenerated LoRA Training Suite
Configured for: ${config.baseModel}
Trigger Token: ${config.triggerWord}
Hyperparameters: Rank ${config.rank}, Alpha ${config.alpha}, Steps ${config.steps}, LR ${config.learningRate}
Generated: ${new Date().toLocaleDateString()}
"""

import os
import sys
import json
import urllib.request
from pathlib import Path

print("="*60)
print("  VELCORA BRAIN AUTOMATED LoRA TRAINING ENVIRONMENT INITIALIZATION")
print("="*60)

# Setup workspace directories
images_dir = Path("./train_images")
images_dir.mkdir(parents=True, exist_ok=True)
print(f"Creating training image pool at: {images_dir.absolute()}")

# Curated dataset inputs (Pre-filtered high-reward prompt pairings)
DATASET_SAMPLES = ${JSON.stringify(datasetSamples, null, 2)}

# 1. Download image pool & write .txt captions
success_count = 0
metadata_pairs = []

for sample in DATASET_SAMPLES:
    img_url = sample["url"]
    caption_text = sample["caption"]
    img_filename = f"image_{sample['id']}.png"
    txt_filename = f"image_{sample['id']}.txt"
    
    img_path = images_dir / img_filename
    txt_path = images_dir / txt_filename
    
    print(f"[{sample['id']}] Transferring visual target: {img_url}...")
    try:
        # Standard urllib fallback request with user-agent
        req = urllib.request.Request(
            img_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VelcoraBrain/1.0'}
        )
        with urllib.request.urlopen(req) as response, open(img_path, 'wb') as out_file:
            out_file.write(response.read())
            
        with open(txt_path, 'w', encoding='utf-8') as cap_file:
            cap_file.write(caption_text)
            
        metadata_pairs.append({
            "file_name": img_filename,
            "text": caption_text
        })
        success_count += 1
    except Exception as e:
        print(f"WARNING: Skipping node {sample['id']} due to socket error: {e}")

print(f"\\n✔ Successfully materialized {success_count}/{len(DATASET_SAMPLES)} training samples.")

# Write metadata.jsonl for diffusers
with open("metadata.jsonl", "w", encoding="utf-8") as f:
    for item in metadata_pairs:
        f.write(json.dumps(item) + "\\n")
print("✔ Created diffusers metadata.jsonl mapping.")

# 2. Package install requirements for cloud host
print("\\nInstalling training framework dependencies...")
os.system("pip install -q diffusers transformers accelerate ftfy tensorboard torchvision xformers peft")

# Configure training parameters
model_id = "${isFlux ? 'black-forest-labs/FLUX.1-dev' : isVideo ? 'Wan-AI/Wan2.1-T2V-1.3B' : 'stabilityai/stable-diffusion-xl-base-1.0'}"
output_dir = "./velcora_lora_out"

print(f"\\nInitiating Training Pipeline for Model ID: {model_id}")
print(f"Settings: Rank={config.rank}, Alpha={config.alpha}, Steps={config.steps}, LR=${config.learningRate}")

# Write accelerator baseline config
accel_config = """
compute_environment: LOCAL_MACHINE
distributed_type: 'NO'
downcast_bf16: 'no'
gpu_ids: all
machine_rank: 0
num_machines: 1
num_processes: 1
rdzv_backend: static
same_network: true
tpu_env: []
tpu_use_single_process: false
use_cpu: false
"""
with open("accelerate_config.yaml", "w") as f:
    f.write(accel_config.strip())

# Formulate execute bash string
train_command = f"""accelerate launch --config_file accelerate_config.yaml \\
  {isFlux ? 'train_flux_lora.py' : isVideo ? 'train_wan_video_lora.py' : 'train_text_to_image_lora.py'} \\
  --pretrained_model_name_or_path="{model_id}" \\
  --dataset_name="." \\
  --image_column="file_name" \\
  --caption_column="text" \\
  --resolution=1024 \\
  --random_flip \\
  --train_batch_size=1 \\
  --num_train_epochs=1 \\
  --max_train_steps={config.steps} \\
  --checkpointing_steps=500 \\
  --learning_rate={config.learningRate} \\
  --lr_scheduler="constant" \\
  --lr_warmup_steps=0 \\
  --seed=42 \\
  --rank={config.rank} \\
  --output_dir="{output_dir}" \\
  --validation_prompt="A commercial ad photo featuring {config.triggerWord} in high detail" \\
  --validation_epochs=100
"""

print("\\n" + "="*50)
print("EXECUTION SH: Execute the command below in Colab/Kaggle Bash cell:")
print("="*50)
print(train_command)

# Save training bash execution wrapper
with open("start_training.sh", "w") as sf:
    sf.write("#!/bin/bash\\n" + train_command)
os.chmod("start_training.sh", 0o755)
print("\\nSaved start_training.sh wrapper.")
`;

  const blob = new Blob([pythonScript], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `velcora_colab_lora_train_${config.triggerWord}.py`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates Kohya-ss or AI-Toolkit config files ready for immediate local training (RTX 3060/4090)
 */
export const generateKohyaConfig = (logs: TelemetryLog[], config: LoraTrainingConfig) => {
  const isFlux = config.baseModel.startsWith('FLUX');
  
  // Construct a standard ai-toolkit / kohya dataset.yaml file
  const aiToolkitYaml = `# AI-Toolkit Training Configuration for local GPUs
# Optimized for RTX 3060 / 4090 architectures
# Reference: https://github.com/ostris/ai-toolkit

job: extension
config:
  name: "velcora_${config.triggerWord}_lora"
  process:
    - type: 'sd_lora'
      training_folder: "output"
      device: cuda:0
      trigger_word: "${config.triggerWord}"
      network:
        type: "lora"
        linear: ${config.rank}
        linear_alpha: ${config.alpha}
      save:
        dtype: float16
        save_every: 250
        max_step_saves_to_keep: 4
      datasets:
        - folder_path: "./dataset"
          caption_ext: "txt"
          resolution: [512, 768, 1024]
      train:
        batch_size: 1
        steps: ${config.steps}
        gradient_accumulation_steps: 1
        learning_rate: ${config.learningRate}
        architecture: ${isFlux ? 'flux' : 'sdxl'}
        optimizer: "adamw8bit"
        lr_scheduler: "cosine"
        noise_scheduler: "scaled_linear"
        target_noise_multiplier: 0.0
      meta:
        name: "velcora_${config.triggerWord}"
        version: '1.0'
`;

  // Standard Kohya dataset JSON
  const kohyaDatasetJson = {
    "general": {
      "enable_bucket": true,
      "bucket_reso_steps": 64,
      "bucket_no_upscale": true
    },
    "datasets": [
      {
        "resolution": [1024, 1024],
        "min_bucket_reso": 256,
        "max_bucket_reso": 2048,
        "caption_extension": ".txt",
        "batch_size": 1,
        "subsets": [
          {
            "image_dir": "./dataset",
            "num_repeats": 10,
            "keep_tokens": 1
          }
        ]
      }
    ]
  };

  const yamlBlob = new Blob([aiToolkitYaml], { type: 'text/yaml;charset=utf-8;' });
  const yamlUrl = URL.createObjectURL(yamlBlob);
  
  // Trigger config download
  const yamlLink = document.createElement('a');
  yamlLink.setAttribute('href', yamlUrl);
  yamlLink.setAttribute('download', 'ai_toolkit_config.yaml');
  yamlLink.style.visibility = 'hidden';
  document.body.appendChild(yamlLink);
  yamlLink.click();
  document.body.removeChild(yamlLink);

  const jsonBlob = new Blob([JSON.stringify(kohyaDatasetJson, null, 2)], { type: 'application/json;charset=utf-8;' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const jsonLink = document.createElement('a');
  jsonLink.setAttribute('href', jsonUrl);
  jsonLink.setAttribute('download', 'kohya_dataset_config.json');
  jsonLink.style.visibility = 'hidden';
  document.body.appendChild(jsonLink);
  jsonLink.click();
  document.body.removeChild(jsonLink);
};
