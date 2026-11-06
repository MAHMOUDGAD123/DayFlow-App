import i18n from '@/i18n/setup';
import { formatTimeMinutes, toArabicIndicNumerals } from '@/i18n/formatters';
import { getCategoryLabel } from '@/utils/categoryHelper';
import { DayTimelineWidgetProps } from './DayTimelineWidget';
import { ActiveTaskWidgetProps } from './ActiveTaskWidget';

export interface WidgetPayloads {
  timelineProps: DayTimelineWidgetProps;
  activeTaskProps: ActiveTaskWidgetProps;
}

export async function resolveWidgetData(
  nowDate = new Date(),
  locale?: string
): Promise<WidgetPayloads> {
  const { getDayData } = await import('@/db/repositories/dayRepo');
  const { dayPlan } = await getDayData(nowDate);
  const effectiveLocale = locale || i18n.language || 'en';
  return buildWidgetPayloads(dayPlan, nowDate, effectiveLocale);
}

export function buildWidgetPayloads(
  dayPlan: import('@/domain/types').DayPlan,
  nowDate = new Date(),
  locale = 'en'
): WidgetPayloads {
  const isRTL = locale.startsWith('ar');
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const currentHour = nowDate.getHours();
  const progressPercent = Math.round(dayPlan.progress * 100);

  // Compute 24-hour occupied array
  const hourlyOccupied = new Array<boolean>(24).fill(false);
  for (const rt of dayPlan.tasks) {
    if (!rt.isSuspended) {
      const startH = Math.floor(rt.segment[0] / 60);
      const endH = Math.min(23, Math.floor(rt.segment[1] / 60));
      for (let h = startH; h <= endH; h++) {
        hourlyOccupied[h] = true;
      }
    }
  }

  // Date formatting
  let dateStr = '';
  if (isRTL) {
    const arDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const arMonths = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    dateStr = `${arDays[nowDate.getDay()]}، ${toArabicIndicNumerals(nowDate.getDate())} ${arMonths[nowDate.getMonth()]}`;
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dateStr = `${days[nowDate.getDay()]}, ${months[nowDate.getMonth()]} ${nowDate.getDate()}`;
  }

  // Find active or next task
  const currentTask = dayPlan.tasks.find(
    (t) => !t.isSuspended && t.segment[0] <= nowMin && nowMin < t.segment[1]
  );

  let activeTaskTitle = isRTL ? 'وقت حر' : 'Free Time';
  let timeRemainingText = isRTL ? 'لا توجد مهام حالية' : 'No active tasks';
  let statusBadge = isRTL ? 'وقت حر' : 'FREE TIME';
  let statusColor: `#${string}` = '#6B7280';
  let taskTitle = isRTL ? 'وقت حر' : 'Free Time';
  let category = '';
  let timeRangeText = isRTL ? 'انتهت جميع مهام اليوم' : 'All done for today';
  const progressText = isRTL ? `${toArabicIndicNumerals(progressPercent)}%` : `${progressPercent}%`;
  let remainingText = isRTL ? `منجز ${progressText}` : `${progressPercent}% done`;

  if (currentTask) {
    const leftMins = currentTask.segment[1] - nowMin;
    const startStr = formatTimeMinutes(currentTask.segment[0], false, locale);
    const endStr = formatTimeMinutes(currentTask.segment[1], false, locale);

    activeTaskTitle = currentTask.task.title;
    timeRemainingText = isRTL ? `${toArabicIndicNumerals(leftMins)} د متبقية` : `${leftMins}m left`;

    statusBadge = isRTL ? 'نشط' : 'ACTIVE';
    statusColor = '#10B981';
    taskTitle = currentTask.task.title;
    category =
      getCategoryLabel(
        currentTask.task.categoryId?.startsWith('categories.')
          ? { nameKey: currentTask.task.categoryId }
          : { customName: currentTask.task.categoryId, nameKey: `categories.${currentTask.task.categoryId}` },
        i18n.t,
        isRTL
      ) || currentTask.task.categoryId || '';
    timeRangeText = `${startStr} – ${endStr}`;
    remainingText = isRTL ? `${toArabicIndicNumerals(leftMins)} د متبقية` : `${leftMins}m left`;
  } else {
    // Find next upcoming task
    const nextTask = dayPlan.tasks
      .filter((t) => !t.isSuspended && t.segment[0] > nowMin)
      .sort((a, b) => a.segment[0] - b.segment[0])[0];

    if (nextTask) {
      const untilMins = nextTask.segment[0] - nowMin;
      const startStr = formatTimeMinutes(nextTask.segment[0], false, locale);

      activeTaskTitle = isRTL ? `التالي: ${nextTask.task.title}` : `Next: ${nextTask.task.title}`;
      timeRemainingText = isRTL
        ? `خلال ${toArabicIndicNumerals(untilMins)} د (${startStr})`
        : `in ${untilMins}m (${startStr})`;

      statusBadge = isRTL ? 'التالي' : 'NEXT UP';
      statusColor = '#3B82F6';
      taskTitle = nextTask.task.title;
      category =
        getCategoryLabel(
          nextTask.task.categoryId?.startsWith('categories.')
            ? { nameKey: nextTask.task.categoryId }
            : { customName: nextTask.task.categoryId, nameKey: `categories.${nextTask.task.categoryId}` },
          i18n.t,
          isRTL
        ) || nextTask.task.categoryId || '';
      timeRangeText = isRTL ? `يبدأ في ${startStr}` : `Starts at ${startStr}`;
      remainingText = isRTL ? `خلال ${toArabicIndicNumerals(untilMins)} د` : `in ${untilMins}m`;
    }
  }

  const timelineProps: DayTimelineWidgetProps = {
    dateStr,
    activeTaskTitle,
    timeRemainingText,
    progressPercent,
    hourlyOccupied,
    currentHour,
    isRTL,
    progressPercentText: isRTL ? `منجز ${progressText}` : `${progressPercent}% done`,
  };

  const activeTaskProps: ActiveTaskWidgetProps = {
    statusBadge,
    statusColor,
    taskTitle,
    category,
    timeRangeText,
    remainingText,
    progressPercent,
    isRTL,
  };

  return {
    timelineProps,
    activeTaskProps,
  };
}
