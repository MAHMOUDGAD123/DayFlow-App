import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import i18n from '@/i18n/setup';
import { DayTimelineWidget } from './DayTimelineWidget';
import { ActiveTaskWidget } from './ActiveTaskWidget';
import { resolveWidgetData } from './widgetDataResolver';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const data = await resolveWidgetData(new Date(), i18n.language);

  switch (props.widgetInfo.widgetName) {
    case 'DayTimelineWidget':
      props.renderWidget(<DayTimelineWidget {...data.timelineProps} />);
      break;
    case 'ActiveTaskWidget':
      props.renderWidget(<ActiveTaskWidget {...data.activeTaskProps} />);
      break;
    default:
      break;
  }
}
