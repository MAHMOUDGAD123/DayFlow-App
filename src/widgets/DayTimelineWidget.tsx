import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface DayTimelineWidgetProps {
  dateStr: string;
  activeTaskTitle: string;
  timeRemainingText: string;
  progressPercent: number;
  hourlyOccupied: boolean[]; // length 24, true if occupied by non-suspended task
  currentHour: number; // 0..23
  isRTL?: boolean;
  progressPercentText?: string;
}

export function DayTimelineWidget({
  dateStr,
  activeTaskTitle,
  timeRemainingText,
  progressPercent,
  hourlyOccupied,
  currentHour,
  isRTL = false,
  progressPercentText,
}: DayTimelineWidgetProps) {
  // In RTL, render hour 23 on the left and hour 0 on the right
  const hours = isRTL
    ? Array.from({ length: 24 }, (_, i) => 23 - i)
    : Array.from({ length: 24 }, (_, i) => i);

  const titleGroup = (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TextWidget
        text="Dayflow"
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: '#3B82F6',
        }}
      />
      <TextWidget
        text={` · ${dateStr}`}
        style={{
          fontSize: 12,
          color: '#8E95A3',
        }}
      />
    </FlexWidget>
  );

  const progressBadge = (
    <TextWidget
      text={progressPercentText || `${progressPercent}% done`}
      style={{
        fontSize: 12,
        fontWeight: 'bold',
        color: '#10B981',
      }}
    />
  );

  const activeTaskWidget = (
    <TextWidget
      text={activeTaskTitle}
      style={{
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: isRTL ? 'right' : 'left',
      }}
      maxLines={1}
      truncate="END"
    />
  );

  const timeRemainingWidget = (
    <TextWidget
      text={timeRemainingText}
      style={{
        fontSize: 12,
        color: '#9CA3AF',
      }}
    />
  );

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121418',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Top Header: App Name, Date, Progress */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {isRTL ? (
          <>
            {progressBadge}
            {titleGroup}
          </>
        ) : (
          <>
            {titleGroup}
            {progressBadge}
          </>
        )}
      </FlexWidget>

      {/* 24-Hour Timeline Bar */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 14,
          backgroundColor: '#1E232B',
          borderRadius: 6,
          flexDirection: 'row',
          overflow: 'hidden',
          alignItems: 'center',
          padding: 1,
        }}
      >
        {hours.map((hour) => {
          const isOccupied = hourlyOccupied[hour];
          const isNow = hour === currentHour;
          let blockColor: `#${string}` = '#2A303C';
          if (isOccupied) {
            blockColor = '#3B82F6';
          }
          if (isNow) {
            blockColor = '#F59E0B';
          }

          return (
            <FlexWidget
              key={hour}
              style={{
                flex: 1,
                height: 'match_parent',
                backgroundColor: blockColor,
                margin: 0.5,
                borderRadius: 2,
              }}
            />
          );
        })}
      </FlexWidget>

      {/* Bottom Info: Active Task & Time Left */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {isRTL ? (
          <>
            {timeRemainingWidget}
            {activeTaskWidget}
          </>
        ) : (
          <>
            {activeTaskWidget}
            {timeRemainingWidget}
          </>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
