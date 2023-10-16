import { NodeSSH } from 'node-ssh';
import { parseArgs, promisify } from "node:util";
import ssh2Config from "ssh2-config";
import { homedir, tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import download from 'download';
import { mkdtemp, chmod, rm } from 'node:fs/promises';

const ssh2ConfigPromise = promisify(ssh2Config);

const VACKUP_URL = "https://raw.githubusercontent.com/BretFisher/docker-vackup/main/vackup";

async function main() {
  const { values: { host }} = parseArgs({
    options: {
      host: {
        type: "string",
        short: "h"
      }
    }
  });
  const app = await App.create(host!);
  app.dispose();
}

class App {
  private tempFolder: string = '';
  private vackupPath: string = '';
  private volumesFolder: string = '';
  private ssh: NodeSSH = new NodeSSH();

  static async create(host: string): Promise<App> {
    const app = new App();
    await app.setup(host);
    return app;
  }

  async setup(host: string) {
    this.tempFolder = await mkdtemp(join(tmpdir(), sep));
    this.volumesFolder = join(this.tempFolder, "volumes");
    this.vackupPath = join(this.tempFolder, "vackup");
    console.log(`Setup temporary directory for vackup & volumes: ${this.tempFolder}`);
    await this.setupSsh(host);
    await this.copyVackup();
  }

  async setupSsh(host: string) {
    const config = await ssh2ConfigPromise({
      host: host!,
      preferSsh2: true
    });
    await this.ssh.connect({
      privateKeyPath: join(homedir(), '.ssh', 'id_rsa'),
      ...config
    });
    const { stdout, stderr, code } = await this.ssh.execCommand(`mkdir ${this.tempFolder}`);
    if (code === 0) {
      console.log(`Setup remote temporary directory for vackup & volumes: ${this.tempFolder}`);
    } else {
      throw `Failed to setup remote temporary directory for vackup & volumes: ${this.tempFolder}\n${stdout}\n${stderr}`;
    }
  }

  async copyVackup() {
    await download(VACKUP_URL, this.tempFolder);
    await chmod(this.vackupPath, 0o544);
    await this.ssh.putFile(this.vackupPath, this.vackupPath);
    await this.ssh.execCommand(`chmod +x ${this.vackupPath}`);
    console.log(`Copied vackup in local & remote: ${this.vackupPath}`);
  }

  async dispose() {
    console.log(`Deleting local & remote temporary folder: ${this.tempFolder}`)
    await rm(this.tempFolder, { recursive: true, force: true })
    const { stdout, stderr, code } = await this.ssh.execCommand(`rm -rf ${this.tempFolder}`);
    if (code !== 0) {
      console.error(`Failed to delete remote temporary folder: ${this.tempFolder}\n${stdout}\n${stderr}`);
    }
    this.ssh.dispose();
  }
}

main()
  .catch(console.error);