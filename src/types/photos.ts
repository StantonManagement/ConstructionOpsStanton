// Photo Documentation Types

export type PhotoType = 'before' | 'in_progress' | 'after' | 'issue' | 'inspection' | 'general';

export type PhotoVisibility = 'public' | 'internal' | 'private';

export type PhotoCollectionType = 'before_after' | 'progress_series' | 'damage_documentation' | 'final_inspection' | 'general';

export type AnnotationType = 'arrow' | 'circle' | 'rectangle' | 'text' | 'measurement';

export interface Photo {
  id: number;
  project_id: number;
  punch_item_id?: number;
  payment_app_id?: number;
  photo_url: string;
  thumbnail_url?: string;
  caption?: string;
  photo_type: PhotoType;
  gps_latitude?: number;
  gps_longitude?: number;
  location_description?: string;
  timestamp: string;
  uploaded_by?: string;
  device_info?: {
    device_type?: string;
    device_model?: string;
    browser?: string;
  };
  visibility: PhotoVisibility;
  tags?: string[];
  file_size?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  project_name?: string;
  uploader_name?: string;
}

export interface PhotoCollection {
  id: number;
  project_id: number;
  collection_name: string;
  collection_type: PhotoCollectionType;
  photo_ids: number[];
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  photos?: Photo[];
}

export interface PhotoAnnotation {
  id: number;
  photo_id: number;
  annotation_type: AnnotationType;
  x_coord?: number;
  y_coord?: number;
  width?: number;
  height?: number;
  annotation_text?: string;
  color: string;
  created_by?: string;
  created_at: string;
}

export interface UploadPhotoRequest {
  project_id: number;
  punch_item_id?: number;
  payment_app_id?: number;
  caption?: string;
  photo_type?: PhotoType;
  location_description?: string;
  visibility?: PhotoVisibility;
  tags?: string[];
}

export interface PhotoFilters {
  project_id?: number;
  punch_item_id?: number;
  payment_app_id?: number;
  photo_type?: PhotoType;
  visibility?: PhotoVisibility;
  uploaded_by?: string;
  date_from?: string;
  date_to?: string;
  has_gps?: boolean;
  tags?: string[];
}

export interface PhotoMetadata {
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
  device?: string;
  width?: number;
  height?: number;
}

