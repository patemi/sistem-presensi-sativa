export class CreateSwapRequestDto {
  target_user_id: string;
  requester_date: string; // 'YYYY-MM-DD'
  target_date: string; // 'YYYY-MM-DD'
  reason: string;
}
