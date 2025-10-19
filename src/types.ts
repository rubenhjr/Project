export interface Movie {
  _id?: string;
  title: string;
  year?: number;
  plot?: string;
  [key: string]: any;
}

export type PartialMovie = Partial<Movie>;
