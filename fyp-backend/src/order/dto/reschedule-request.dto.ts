export interface CreateRescheduleRequestDto {
  eventDate: string;
  eventTime: string;
  durationMinutes: number;
  reason?: string;
}

export interface RespondRescheduleRequestDto {
  status: 'ACCEPTED' | 'REJECTED';
  message?: string;
}
