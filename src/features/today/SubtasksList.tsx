import { AppText } from '@/components/common/AppText';
import { AppTextInput } from '@/components/common/AppTextInput';
import { DaySubtask } from '@/db/repositories/dayRepo';
import { useTheme } from '@/theme/ThemeContext';
import { CheckSquare, Plus, Square, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

interface SubtasksListProps {
  taskId: string;
  subtasks: DaySubtask[];
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (id: string, isDone: boolean) => void;
  onDeleteSubtask: (id: string) => void;
}

export function SubtasksList({
  taskId,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: SubtasksListProps) {
  const { t } = useTranslation();
  const { colors, dirRow, textAlign } = useTheme();
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddSubtask(newTitle.trim());
    setNewTitle('');
  };

  const taskSubtasks = subtasks.filter((s) => s.taskId === taskId);

  return (
    <View style={styles.container}>
      {/* Existing subtasks */}
      {taskSubtasks.map((sub) => (
        <View key={sub.id} style={[styles.subtaskRow, { flexDirection: dirRow }]}>
          <Pressable
            style={[styles.checkboxTouchable, { flexDirection: dirRow }]}
            onPress={() => onToggleSubtask(sub.id, !sub.isDone)}
            hitSlop={6}
          >
            {sub.isDone ? (
              <CheckSquare size={18} color={colors.accent} />
            ) : (
              <Square size={18} color={colors.textSecondary} />
            )}
            <AppText
              style={[
                styles.subtaskTitle,
                { color: sub.isDone ? colors.textMuted : colors.text, textAlign },
                sub.isDone && styles.completedText,
              ]}
            >
              {sub.title}
            </AppText>
          </Pressable>
          <Pressable onPress={() => onDeleteSubtask(sub.id)} hitSlop={6}>
            <Trash2 size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      {/* Add smaller task input */}
      <View
        style={[
          styles.inputRow,
          {
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surfaceVariant,
            flexDirection: dirRow,
          },
        ]}
      >
        <AppTextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: 'transparent', backgroundColor: 'transparent' },
          ]}
          placeholder={t('today.addSubtaskPlaceholder', 'Add smaller task for today...')}
          placeholderTextColor={colors.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.addButton,
            { backgroundColor: newTitle.trim() ? colors.accent : colors.surfaceBorder },
          ]}
          onPress={handleAdd}
          disabled={!newTitle.trim()}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.12)',
    gap: 6,
  },
  subtaskRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  checkboxTouchable: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 13,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  inputRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 6,
    borderWidth: 0,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});
