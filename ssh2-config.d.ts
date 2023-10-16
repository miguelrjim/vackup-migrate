declare module 'ssh2-config' {
  interface Callback {
    (error: any, result: SshConfig): void
  }

  interface Options {
    host: string;
    commandLineOptions?: string[];
    userSpecificFile?: string;
    result?: any;
    preferSsh2?: boolean;
    callback?: Callback;
  }

  interface SshConfig {
    host: string;
    port: number;
    username: string;
    privateKey: string;
  }

  export default function(options: Options, callback: Callback): void
}