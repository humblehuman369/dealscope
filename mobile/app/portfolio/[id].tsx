import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { savedPropertiesService } from '../../services/savedPropertiesService';
import type {
  SavedPropertyResponse,
  SavedPropertyUpdate,
  PropertyStatus,
  ColorLabel,
} from '../../types';
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_OPTIONS } from '../../types';
import PropertyStatusBadge from '../../components/property/PropertyStatusBadge';
import StatusPipeline from '../../components/property/StatusPipeline';
import { isValidId, InvalidParamFallback } from '../../hooks/useValidatedParams';

const COLOR_OPTIONS: { value: ColorLabel; color: string }[] = [
  { value: 'red', color: '#ef4444' },
  { value: 'green', color: '#22c55e' },
  { value: 'blue', color: '#3b82f6' },
  { value: 'yellow', color: '#eab308' },
  { value: 'purple', color: '#a855f7' },
  { value: 'orange', color: '#f97316' },
  { value: 'gray', color: '#6b7280' },
];

export default function PropertyDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();

  // State
  const [property, setProperty] = useState<SavedPropertyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('watching');
  const [colorLabel, setColorLabel] = useState<ColorLabel | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Load property data
  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const data = await savedPropertiesService.getSavedProperty(id);
      setProperty(data);

      // Set editable fields
      setNickname(data.nickname || '');
      setNotes(data.notes || '');
      setStatus(data.status);
      setColorLabel(data.color_label);
      setPriority(data.priority);
      setTags(data.tags || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', message || 'Failed to load property');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const update: SavedPropertyUpdate = {
        nickname: nickname || null,
        notes: notes || null,
        status,
        color_label: colorLabel,
        priority,
        tags: tags.length > 0 ? tags : null,
      };

      await savedPropertiesService.updateSavedProperty(id, update);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Success', 'Property updated');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: PropertyStatus) => {
    if (!id) return;

    try {
      setStatus(newStatus);
      await savedPropertiesService.updateSavedProperty(id, { status: newStatus });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setStatus(property?.status || 'watching');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Property', 'Are you sure you want to delete this property?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await savedPropertiesService.deleteSavedProperty(id!);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Alert.alert('Error', message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTags(tags.filter((t) => t !== tag));
  };

  const handleViewAnalysis = () => {
    if (property) {
      const address = property.full_address || property.address_street;
      router.push(`/verdict-iq/${encodeURIComponent(address)}` as any);
    }
  };

  const handleOpenDealMaker = () => {
    if (property) {
      const address = property.full_address || property.address_street;
      router.push(`/deal-maker/${encodeURIComponent(address)}` as any);
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
    section: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    sectionTitle: { color: theme.sectionTitle },
    label: { color: theme.textSecondary },
    input: { backgroundColor: theme.backgroundTertiary, color: theme.text, borderColor: theme.border },
  };

  if (!isValidId(id)) return <InvalidParamFallback message="Property not found" />;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.container, styles.loadingContainer, dynamicStyles.container]}>
        <Text style={{ color: theme.text }}>Property not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
          {property.nickname || property.address_street}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Address Section */}
        <View style={[styles.addressSection, dynamicStyles.section]}>
          <Text style={[styles.addressStreet, { color: theme.text }]}>{property.address_street}</Text>
          <Text style={[styles.addressCity, { color: theme.textMuted }]}>
            {[property.address_city, property.address_state, property.address_zip]
              .filter(Boolean)
              .join(', ')}
          </Text>
          <View style={styles.addressActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleViewAnalysis}>
              <Ionicons name="analytics" size={18} color={colors.primary[isDark ? 300 : 600]} />
              <Text style={[styles.actionButtonText, { color: colors.primary[isDark ? 300 : 600] }]}>
                View Analysis
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleOpenDealMaker}>
              <Ionicons name="calculator" size={18} color={colors.primary[isDark ? 300 : 600]} />
              <Text style={[styles.actionButtonText, { color: colors.primary[isDark ? 300 : 600] }]}>
                Deal Maker
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Pipeline */}
        <View style={styles.sectionWrapper}>
          <StatusPipeline currentStatus={status} onStatusChange={handleStatusChange} />
        </View>

        {/* Details Section */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>DETAILS</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            {/* Nickname */}
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Nickname</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Give this property a nickname..."
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Color Label */}
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Color Label</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.colorOption,
                      { backgroundColor: option.color },
                      colorLabel === option.value && styles.colorOptionSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setColorLabel(colorLabel === option.value ? null : option.value);
                    }}
                  >
                    {colorLabel === option.value && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Priority</Text>
              <View style={styles.priorityRow}>
                {[1, 2, 3, 4, 5].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPriority(priority === p ? null : p);
                    }}
                  >
                    <Ionicons
                      name={priority && priority >= p ? 'star' : 'star-outline'}
                      size={28}
                      color={priority && priority >= p ? colors.warning.main : theme.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags */}
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Tags</Text>
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      { backgroundColor: isDark ? colors.navy[700] : colors.gray[100] },
                    ]}
                    onPress={() => handleRemoveTag(tag)}
                  >
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
                    <Ionicons name="close" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, dynamicStyles.input, { flex: 1 }]}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Add a tag..."
                  placeholderTextColor={theme.textMuted}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, dynamicStyles.input]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this property..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </View>

        {/* Metrics Section */}
        {property.best_cash_flow !== null && (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>QUICK METRICS</Text>
            <View style={[styles.section, dynamicStyles.section]}>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Best Strategy</Text>
                  <Text style={[styles.metricValue, { color: colors.primary[isDark ? 300 : 600] }]}>
                    {property.best_strategy?.toUpperCase() || '--'}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Cash Flow</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          property.best_cash_flow >= 0 ? colors.profit.main : colors.loss.main,
                      },
                    ]}
                  >
                    ${property.best_cash_flow?.toLocaleString()}/mo
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>CoC Return</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>
                    {property.best_coc_return
                      ? `${(property.best_coc_return * 100).toFixed(1)}%`
                      : '--'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>DANGER ZONE</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash" size={18} color={colors.loss.main} />
              <Text style={styles.deleteButtonText}>Delete Property</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  addressSection: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  addressStreet: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressCity: {
    fontSize: 14,
    marginBottom: 16,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionWrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.loss.main,
  },
});
