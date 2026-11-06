import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';
import { Button } from './Button';
import { AlertTriangle, Trash2, Info } from 'lucide-react-native';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  style?: ViewStyle;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  icon,
  loading = false,
  onConfirm,
  onCancel,
  style,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const { colors, dirRow, textAlign } = useTheme();

  if (!visible) return null;

  let iconBgColor = colors.dangerLight;
  let defaultIcon = <Trash2 size={22} color={colors.danger} />;

  if (variant === 'warning') {
    iconBgColor = colors.warningLight;
    defaultIcon = <AlertTriangle size={22} color={colors.warning} />;
  } else if (variant === 'primary') {
    iconBgColor = colors.accentLight;
    defaultIcon = <Info size={22} color={colors.accent} />;
  }

  const resolvedConfirmLabel =
    confirmLabel ||
    (variant === 'danger' ? t('common.delete', 'Delete') : t('common.confirm', 'Confirm'));
  const resolvedCancelLabel = cancelLabel || t('common.cancel', 'Cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Click outside to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        />

        {/* Dialog card */}
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
            style,
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header with Icon and Title */}
          <View style={[styles.header, { flexDirection: dirRow }]}>
            <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
              {icon || defaultIcon}
            </View>
            <View style={styles.titleContainer}>
              <AppText weight="bold" style={[styles.title, { color: colors.text, textAlign }]}>
                {title}
              </AppText>
            </View>
          </View>

          {/* Confirmation Message */}
          <AppText style={[styles.message, { color: colors.textMuted, textAlign }]}>
            {message}
          </AppText>

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { flexDirection: dirRow }]}>
            <Button
              title={resolvedCancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={styles.actionBtn}
            />
            <Button
              title={resolvedConfirmLabel}
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              disabled={loading}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  actionsRow: {
    marginTop: 22,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
});
