export type ProviderId = 'heygen' | 'veo' | 'sora' | (string & {});

export type ProviderCapability =
  | 'talking_head'
  | 'image_to_video'
  | 'face_swap'
  | 'character_swap';

export type ProviderStatus = 'enabled' | 'disabled' | 'misconfigured';

export interface ProviderPublic {
  provider_id: ProviderId;
  name: string;
  enabled: boolean;
  status: ProviderStatus;
  capabilities: ProviderCapability[];
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export type JobType = 'generate_video';

export interface GenerateVideoRequest {
  provider_id: ProviderId;
  mode: ProviderCapability;
  prompt?: string;
  script?: string;
  aspect_ratio?: '9:16' | '16:9' | '1:1' | string;
  duration_seconds?: number;
  input_image_asset_id?: string;
  input_video_asset_id?: string;
  avatar_id?: string;
  options?: Record<string, unknown>;
}

export interface CreateJobRequest {
  type: JobType;
  request: GenerateVideoRequest;
}

export interface JobRow {
  id: string;
  type: JobType;
  status: JobStatus;
  provider_id: ProviderId;
  mode: ProviderCapability;
  request: Record<string, unknown>;
  provider_job_id: string | null;
  output_asset_id: string | null;
  error: string | null;
  progress: number | null;
  created_at: string;
  updated_at: string;
}
