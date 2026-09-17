export function computeAvailableSlots({ schedule, durationMinutes, from, to, existingBookings = [] }) {
  if (!schedule || !Array.isArray(schedule.weeklySlots) || !schedule.weeklySlots.length) return [];

  const buffer       = (schedule.bufferMinutes || 0) * 60 * 1000;
  const minNotice    = (schedule.advanceNoticeHours || 0) * 60 * 60 * 1000;
  const earliestStart = new Date(Date.now() + minNotice);

  const blockedSet = new Set((schedule.blockedDates || []).map((d) => new Date(d).toISOString().slice(0, 10)));

  const slots = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= to) {
    const dayOfWeek = cursor.getDay();
    const isoDate   = cursor.toISOString().slice(0, 10);
    if (blockedSet.has(isoDate)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    const todaySchedules = schedule.weeklySlots.filter((s) => s.dayOfWeek === dayOfWeek);
    for (const s of todaySchedules) {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const dayStart = new Date(cursor); dayStart.setHours(sh, sm, 0, 0);
      const dayEnd   = new Date(cursor); dayEnd.setHours(eh, em, 0, 0);

      let slotStart = new Date(dayStart);
      while (slotStart.getTime() + durationMinutes * 60 * 1000 <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

        const tooSoon  = slotStart < earliestStart;
        const collides = existingBookings.some((b) => {
          const bs = new Date(b.startsAt).getTime() - buffer;
          const be = new Date(b.endsAt).getTime() + buffer;
          return slotStart.getTime() < be && slotEnd.getTime() > bs;
        });

        if (!tooSoon && !collides) {
          slots.push(slotStart.toISOString());
        }
        slotStart = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}
