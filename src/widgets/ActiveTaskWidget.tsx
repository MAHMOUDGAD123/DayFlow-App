import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface ActiveTaskWidgetProps {
  statusBadge: string; // 'ACTIVE' | 'NEXT UP' | 'FREE TIME' | 'COMPLETED'
  statusColor: `#${string}`;
  taskTitle: string;
  category: string;
  timeRangeText: string;
  remainingText: string;
  progressPercent: number;
  isRTL?: boolean;
}

export function ActiveTaskWidget({
  statusBadge,
  statusColor,
  taskTitle,
  category,
  timeRangeText,
  remainingText,
  progressPercent,
  isRTL = false,
}: ActiveTaskWidgetProps) {
  const appTitle = (
    <TextWidget
      text="Dayflow"
      style={{
        fontSize: 13,
        fontWeight: 'bold',
        color: '#3B82F6',
      }}
    />
  );

  const badgeWidget = (
    <FlexWidget
      style={{
        backgroundColor: statusColor,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <TextWidget
        text={statusBadge}
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          color: '#FFFFFF',
        }}
      />
    </FlexWidget>
  );

  const rangeWidget = (
    <TextWidget
      text={timeRangeText}
      style={{
        fontSize: 11,
        color: '#9CA3AF',
      }}
    />
  );

  const progressWidget = (
    <TextWidget
      text={remainingText || `${progressPercent}%`}
      style={{
        fontSize: 11,
        fontWeight: 'bold',
        color: '#10B981',
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
      {/* Header: App Name & Status Badge */}
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
            {badgeWidget}
            {appTitle}
          </>
        ) : (
          <>
            {appTitle}
            {badgeWidget}
          </>
        )}
      </FlexWidget>

      {/* Middle: Big Task Title & Category */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        <TextWidget
          text={taskTitle}
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: isRTL ? 'right' : 'left',
          }}
          maxLines={1}
          truncate="END"
        />

        {category ? (
          <TextWidget
            text={category}
            style={{
              fontSize: 11,
              color: '#8E95A3',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
        ) : null}
      </FlexWidget>

      {/* Bottom: Time Range, Remaining, & Progress */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1C212A',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        {isRTL ? (
          <>
            {progressWidget}
            {rangeWidget}
          </>
        ) : (
          <>
            {rangeWidget}
            {progressWidget}
          </>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
