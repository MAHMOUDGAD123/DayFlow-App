import { Minute } from '@/domain/types';
import { toArabicIndicNumerals } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

export interface TimelineSegment {
  start: Minute;
  end: Minute; // if end < start, crosses midnight (rendered up to 1440)
  color: string;
  isEmergency?: boolean;
}

interface DayTimelineBarProps {
  segments: TimelineSegment[];
  height?: number;
  showNowPointer?: boolean;
  nowMinute?: Minute;
  showHourTicks?: boolean;
}

export function DayTimelineBar({
  segments,
  height = 28,
  showNowPointer = false,
  nowMinute,
  showHourTicks = false,
}: DayTimelineBarProps) {
  const { colors, isRTL, fonts } = useTheme();

  // Flatten and clip all segments across [0, 1440]
  const renderedSegments = useMemo(() => {
    const list: { x: number; width: number; color: string }[] = [];

    for (const s of segments) {
      const color = s.isEmergency ? colors.danger : s.color;
      if (s.end >= s.start) {
        const startX = (s.start / 1440) * 100;
        const width = ((s.end - s.start) / 1440) * 100;
        list.push({
          x: isRTL ? 100 - startX - width : startX,
          width,
          color,
        });
      } else {
        // Crosses midnight: segment 1 from start to 1440
        const startX1 = (s.start / 1440) * 100;
        const width1 = ((1440 - s.start) / 1440) * 100;
        list.push({
          x: isRTL ? 100 - startX1 - width1 : startX1,
          width: width1,
          color,
        });

        // Segment 2 from 0 to end (tomorrow portion)
        if (s.end > 0) {
          const width2 = (s.end / 1440) * 100;
          list.push({
            x: isRTL ? 100 - width2 : 0,
            width: width2,
            color,
          });
        }
      }
    }

    return list;
  }, [segments, isRTL, colors.danger]);

  // Now pointer calculation (percentage across 1440 minutes)
  const nowPercent = useMemo(() => {
    if (!showNowPointer) return null;
    const current =
      nowMinute != null ? nowMinute : new Date().getHours() * 60 + new Date().getMinutes();
    const pct = (current / 1440) * 100;
    return isRTL ? 100 - pct : pct;
  }, [showNowPointer, nowMinute, isRTL]);

  return (
    <View style={styles.container} pointerEvents="none">
      <View
        style={[
          styles.barWrapper,
          {
            height,
            backgroundColor: colors.freeSlot,
            borderColor: colors.freeSlotBorder,
          },
        ]}
      >
        <Svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Neutral Background */}
          <Rect x="0" y="0" width="100" height="100" fill={colors.freeSlot} />

          {/* Render Activity and Emergency Segments */}
          {renderedSegments.map((seg, idx) => (
            <Rect
              key={idx}
              x={`${seg.x}%`}
              y="0"
              width={`${seg.width}%`}
              height="100"
              fill={seg.color}
              rx="1"
            />
          ))}

          {/* Current Time Pointer Line */}
          {nowPercent != null ? (
            <Line
              x1={`${nowPercent}%`}
              y1="0"
              x2={`${nowPercent}%`}
              y2="100"
              stroke={colors.timelineNow}
              strokeWidth="1"
            />
          ) : null}
        </Svg>

        {/* Current Time Indicator Dot */}
        {nowPercent != null ? (
          <View
            style={[
              styles.pointerDot,
              {
                left: `${nowPercent}%`,
                backgroundColor: colors.timelineNow,
                borderColor: colors.timelineNow,
              },
            ]}
          />
        ) : null}
      </View>

      {/* Hour Markers (00:00, 06:00, 12:00, 18:00, 24:00) */}
      {showHourTicks ? (
        <View style={[styles.ticksRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.tickText, { color: colors.textMuted, fontFamily: fonts.bold }]}>
            {isRTL ? toArabicIndicNumerals('00:00') : '00:00'}
          </Text>
          <Text style={[styles.tickText, { color: colors.textMuted, fontFamily: fonts.bold }]}>
            {isRTL ? toArabicIndicNumerals('06:00') : '06:00'}
          </Text>
          <Text style={[styles.tickText, { color: colors.textMuted, fontFamily: fonts.bold }]}>
            {isRTL ? toArabicIndicNumerals('12:00') : '12:00'}
          </Text>
          <Text style={[styles.tickText, { color: colors.textMuted, fontFamily: fonts.bold }]}>
            {isRTL ? toArabicIndicNumerals('18:00') : '18:00'}
          </Text>
          <Text style={[styles.tickText, { color: colors.textMuted, fontFamily: fonts.bold }]}>
            {isRTL ? toArabicIndicNumerals('24:00') : '24:00'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barWrapper: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  pointerDot: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    marginLeft: -5,
  },
  ticksRow: {
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  tickText: {
    fontSize: 12,
  },
});
