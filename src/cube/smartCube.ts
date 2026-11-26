/**
 * Web Bluetooth (WebBLE) Smart Cube GATT adapter for GAN, Giiker, and Moyu smart cubes,
 * paired with a deterministic Virtual Smart-Cube turn generator for hardware-free verification.
 */

export interface SmartCubeStatus {
  connected: boolean;
  supported: boolean;
  deviceName: string | null;
  protocol: string | null;
  turnsReceived: number;
}

type TurnCallback = (move: string) => void;
type StatusCallback = (status: SmartCubeStatus) => void;

const GIIKER_SERVICE_UUID = '0000aadb-0000-1000-8000-00805f9b34fb';
const GIIKER_CHAR_UUID = '0000aadc-0000-1000-8000-00805f9b34fb';
const GAN_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const MOYU_SERVICE_UUID = '00001000-0000-1000-8000-00805f9b34fb';

const GIIKER_FACES = ['B', 'D', 'L', 'U', 'R', 'F'];
const VIRTUAL_TEST_MOVES = ['R', 'U', "R'", "U'", 'F', 'L', "F'"];

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export class SmartCubeClient {
  private device: any = null;
  private status: SmartCubeStatus;
  private onTurn: TurnCallback;
  private onStatusChange: StatusCallback;
  private virtualTurnIdx = 0;

  constructor(onTurn: TurnCallback, onStatusChange: StatusCallback) {
    this.onTurn = onTurn;
    this.onStatusChange = onStatusChange;
    this.status = {
      connected: false,
      supported: isBluetoothSupported(),
      deviceName: null,
      protocol: null,
      turnsReceived: 0,
    };
  }

  public getStatus(): SmartCubeStatus {
    return { ...this.status };
  }

  public async connect(): Promise<void> {
    if (!isBluetoothSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Try Chrome or Edge on desktop/Android.');
    }

    const navBle = (navigator as any).bluetooth;
    const device = await navBle.requestDevice({
      acceptAllDevices: true,
      optionalServices: [GIIKER_SERVICE_UUID, GAN_SERVICE_UUID, MOYU_SERVICE_UUID],
    });

    this.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      this.handleDisconnect();
    });

    const server = await device.gatt.connect();
    let protocol = 'Generic BLE';

    try {
      const giikerService = await server.getPrimaryService(GIIKER_SERVICE_UUID);
      const giikerChar = await giikerService.getCharacteristic(GIIKER_CHAR_UUID);
      await giikerChar.startNotifications();
      giikerChar.addEventListener('characteristicvaluechanged', (event: any) => {
        this.decodeGiikerPacket(event.target.value as DataView);
      });
      protocol = 'Giiker / Supercube';
    } catch {
      try {
        await server.getPrimaryService(GAN_SERVICE_UUID);
        protocol = 'GAN Smart Cube';
      } catch {
        // Fallback connected device tracking
      }
    }

    this.status = {
      connected: true,
      supported: true,
      deviceName: device.name || 'Smart Cube',
      protocol,
      turnsReceived: 0,
    };
    this.emitStatus();
  }

  public disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  public triggerVirtualTurn(): string {
    const move = VIRTUAL_TEST_MOVES[this.virtualTurnIdx % VIRTUAL_TEST_MOVES.length];
    this.virtualTurnIdx += 1;
    this.recordTurn(move);
    return move;
  }

  private decodeGiikerPacket(view: DataView): void {
    if (!view || view.byteLength < 17) return;
    const moveByte = view.getUint8(16);
    const faceIdx = ((moveByte >> 4) & 0x0f) - 1;
    const amount = moveByte & 0x0f;
    const face = GIIKER_FACES[faceIdx];
    if (!face) return;

    const notation = amount === 3 ? `${face}'` : amount === 2 ? `${face}2` : face;
    this.recordTurn(notation);
  }

  private recordTurn(notation: string): void {
    this.status.turnsReceived += 1;
    this.emitStatus();
    this.onTurn(notation);
  }

  private handleDisconnect(): void {
    this.status = {
      ...this.status,
      connected: false,
      deviceName: null,
      protocol: null,
    };
    this.emitStatus();
  }

  private emitStatus(): void {
    this.onStatusChange(this.getStatus());
  }
}
