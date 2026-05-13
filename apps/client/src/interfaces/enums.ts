export enum AppEnvMode {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum ClientPlatform {
  H5 = 'h5',
  MpWeixin = 'mp-weixin',
}

export enum RequestMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
}

export enum RequestErrorCode {
  Http = 'HTTP_ERROR',
  Business = 'BUSINESS_ERROR',
  Network = 'NETWORK_ERROR',
  Timeout = 'TIMEOUT_ERROR',
  Canceled = 'CANCELED',
  Unknown = 'UNKNOWN_ERROR',
}
