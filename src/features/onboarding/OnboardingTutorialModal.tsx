import { AppLogo } from '@/components/common/AppLogo';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { setBackupFolderUri } from '@/db/repositories/backupRepo';
import { markOnboardingCompleted } from '@/db/repositories/settingsRepo';
import { requestBackupFolderPermission } from '@/services/backup/safStorage';
import { useTheme } from '@/theme/ThemeContext';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Folder,
    HardDrive,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface OnboardingTutorialModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function OnboardingTutorialModal({ visible, onDismiss }: OnboardingTutorialModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [folderConnected, setFolderConnected] = useState(false);

  const slides = [
    {
      icon: <AppLogo size={52} />,
      title: t('onboarding.slide1Title', 'Welcome to Dayflow'),
      desc: t(
        'onboarding.slide1Desc',
        'Your daily productivity companion. Build customizable 24-hour routine profiles, align your schedule with prayer times, and track your daily momentum.',
      ),
    },
    {
      icon: <Clock size={44} color={colors.accent} />,
      title: t('onboarding.slide2Title', '24-Hour Day Timeline'),
      desc: t(
        'onboarding.slide2Desc',
        'Visualize your occupied hours and interstitial free time on an interactive 24-hour timeline bar with a live current-time pointer.',
      ),
    },
    {
      icon: <AlertTriangle size={44} color={colors.danger} />,
      title: t('onboarding.slide3Title', 'Emergency Overrides'),
      desc: t(
        'onboarding.slide3Desc',
        'Unexpected illness or travel? Create an emergency event to temporarily suspend daily activities without altering your routine templates. "Important" tasks remain active.',
      ),
    },
    {
      icon: <HardDrive size={44} color={colors.accent} />,
      title: t('onboarding.slide4Title', 'Persistent Local Backup'),
      desc: t(
        'onboarding.slide4Desc',
        'Dayflow saves all your profiles and routines into your local "dayflow_backup" folder. Your data survives app uninstallation and stays 100% private on your phone.',
      ),
      isBackupStep: true,
    },
    {
      icon: <CheckCircle2 size={44} color={colors.success} />,
      title: t('onboarding.slide5Title', "You're All Set!"),
      desc: t(
        'onboarding.slide5Desc',
        'Start organizing your day by customizing your routine profiles. Have a productive and fulfilling day!',
      ),
    },
  ];

  const handleFinish = async () => {
    await markOnboardingCompleted();
    onDismiss();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      void handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleConnectFolder = async () => {
    try {
      const res = await requestBackupFolderPermission();
      if (res.granted && res.directoryUri) {
        await setBackupFolderUri(res.directoryUri);
        setFolderConnected(true);
      }
    } catch {
      // Ignore
    }
  };

  const currentSlide = slides[currentIndex];
  const isLast = currentIndex === slides.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleFinish}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleFinish} />
        <Card style={styles.modalCard}>
          {/* Top Bar: Skip */}
          <View style={styles.topBar}>
            <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
              {currentIndex + 1} / {slides.length}
            </Text>
            {!isLast && (
              <Pressable onPress={handleFinish} hitSlop={8}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                  {t('common.skip', 'Skip')}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Icon & Content */}
          <View style={styles.contentContainer}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceVariant }]}>
              {currentSlide.icon}
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{currentSlide.title}</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>{currentSlide.desc}</Text>

            {/* Optional Backup Folder Connect button on slide 3 */}
            {currentSlide.isBackupStep && (
              <View style={styles.backupActionBox}>
                <Button
                  title={
                    folderConnected
                      ? t('backup.connected', 'Backup Folder Connected!')
                      : t('backup.selectFolderBtn', 'Select Backup Folder (SAF)')
                  }
                  variant={folderConnected ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={handleConnectFolder}
                  icon={
                    folderConnected ? (
                      <CheckCircle2 size={20} color="#FFFFFF" />
                    ) : (
                      <Folder size={20} color={colors.text} />
                    )
                  }
                />
              </View>
            )}
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {slides.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  { backgroundColor: colors.surfaceBorder },
                  idx === currentIndex && { backgroundColor: colors.accent, width: 20 },
                ]}
              />
            ))}
          </View>

          {/* Navigation Controls */}
          <View style={styles.footerControls}>
            <Button
              title={t('common.previous', 'Previous')}
              variant="ghost"
              disabled={currentIndex === 0}
              onPress={handlePrev}
              icon={
                <ChevronLeft
                  size={20}
                  color={currentIndex === 0 ? colors.textMuted : colors.text}
                />
              }
            />

            <Button
              title={isLast ? t('onboarding.getStarted', 'Get Started') : t('common.next', 'Next')}
              variant="primary"
              onPress={handleNext}
              icon={
                isLast ? (
                  <CheckCircle2 size={20} color="#FFFFFF" />
                ) : (
                  <ChevronRight size={20} color="#FFFFFF" />
                )
              }
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  backupActionBox: {
    marginTop: 16,
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
