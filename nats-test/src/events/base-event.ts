import { SUBJECTS } from "./events";

export interface Event<TData> {
  subject: SUBJECTS;
  data: TData;
}
