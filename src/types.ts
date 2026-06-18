export interface Header {
  id: string;
  key: string;
  value: string;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Header[];
  data: string;
}

export interface ResponseResult {
  status?: number;
  statusText?: string;
  headers?: any;
  data?: string;
  timeMs: number;
  sizeBytes?: number;
  error?: string;
  code?: string;
}
