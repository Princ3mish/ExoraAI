export type VoiceCallStatus = 'pending' | 'completed' | 'failed' | 'no_answer';
export type ConfirmationStatus = 'unconfirmed' | 'confirmed' | 'rescheduled';
export type ParticipantStatus = 'pending' | 'confirmed' | 'declined';

export interface ParticipantUser {
  id: string;
  name: string;
  email: string;
}

export interface Participant {
  userId: string;
  meetingId: string;
  status: ParticipantStatus;
  phoneNumber?: string;
  voiceResponse?: string;
  user: ParticipantUser;
}

export interface Meeting {
  id: string;
  title: string;
  startTime: string; // ISO-8601 datetime string
  endTime: string;
  status: string;
  organizerId: string;
  agendaTopics: string[];
  voiceCallStatus: VoiceCallStatus;
  confirmationStatus: ConfirmationStatus;
  participants: Participant[];
}

/** Shape returned by GET /api/meetings/calendar */
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO-8601
  endTime: string;
  voiceCallStatus: VoiceCallStatus;
  confirmationStatus: ConfirmationStatus;
  participantCount: number;
  confirmedCount: number;
}
