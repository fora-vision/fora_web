import { SkeletData, RoomResponse, Exercise } from "./models";

export enum WorkoutDisconnectStatus {
  Success = 1000,
  AlreadyCompleted = 1002,
  NoFreeWorkers = 1006,
  Error = 0,
}

export interface WorkoutWorkerDelegate {
  onDidStart(worker: WorkoutWorker): void;
  onDidDisconnect(worker: WorkoutWorker, status: WorkoutDisconnectStatus): void;
  onDidCompleteExercise(worker: WorkoutWorker): void;
  onDidNextExercise(worker: WorkoutWorker, exercise: string, num: number): void;
}

export class WorkoutWorker {
  private socket: WebSocket;
  private endpoint = "wss://dev.fora.vision";
  private isStarted = false;

  public delegate?: WorkoutWorkerDelegate;

  constructor(readonly workoutId: number) {
    this.socket = new WebSocket(
      `${this.endpoint}/api/v2/workout/ws/recognizer/${workoutId}`
    );

    this.socket.onopen = () => {
      this.isStarted = true;
      this.delegate?.onDidStart(this);
    };

    this.socket.onerror = (err) => {
      console.log(err);
      this.isStarted = false;
      this.delegate?.onDidDisconnect(this, WorkoutDisconnectStatus.Error);
    };

    this.socket.onclose = (err) => {
      console.log(err);
      this.isStarted = false;
      this.delegate?.onDidDisconnect(this, err.code);
    };

    this.socket.onmessage = (event) => {
      const action = JSON.parse(event.data);
      console.log(action);

      if (action.type === "NEW_REPEAT_FOUND") {
        this.delegate?.onDidCompleteExercise(this);
      }

      if (action.type === "NEXT_EXERCISE") {
        this.delegate?.onDidNextExercise(
          this,
          action.label,
          action.exercise_num
        );
      }
    };
  }

  sendFrame(skelet: SkeletData) {
    if (!this.isStarted) return;
    this.socket.send(JSON.stringify(skelet));
  }
}

export class WorkoutApi {
  private session: string = "";
  private endpoint = "https://dev.fora.vision";

  public setAuthToken(session: string) {
    this.session = session;
  }

  private async fetch<T = any>(
    input: RequestInfo,
    init: RequestInit = {}
  ): Promise<T> {
    const auth = { Authorization: this.session };
    const res = await fetch(`${this.endpoint}/${input}`, {
      ...init,
      headers: Object.assign(auth, init.headers),
    });

    if (!res.ok) {
      throw Error(res.statusText);
    }

    return await res.json();
  }

  async getExercises(id: number): Promise<Record<string, Exercise>> {
    const res = await this.fetch("api/v1/workout/exercises");
    return res.exercises;
  }

  async loadRoom(jwt: string): Promise<RoomResponse> {
    return await this.fetch(`api/v1/workout/room?w=${jwt}`);
  }
}
