import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { documentsService, formatFileSize, getFileIcon } from '../../services/documentsService';
import type { DocumentResponse, DocumentType } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../types';

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  // State
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load documents
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentsService.getDocuments({ limit: 50 });
      setDocuments(response.items);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDocuments();
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      await uploadDocument(file.uri, file.name, file.mimeType || 'application/octet-stream');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick document');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await uploadDocument(asset.uri, `photo_${Date.now()}.jpg`, 'image/jpeg');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const uploadDocument = async (uri: string, name: string, type: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await documentsService.uploadDocument(
        {
          file: { uri, name, type },
          document_type: 'other',
        },
        (progress) => setUploadProgress(progress)
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadDocuments();
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = (doc: DocumentResponse) => {
    Alert.alert('Delete Document', `Delete "${doc.original_filename}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await documentsService.deleteDocument(doc.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setDocuments(documents.filter((d) => d.id !== doc.id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleViewDocument = async (doc: DocumentResponse) => {
    try {
      const { url } = await documentsService.getDocumentUrl(doc.id);
      router.push(`/documents/${doc.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open document');
    }
  };

  const showUploadOptions = () => {
    Alert.alert('Upload Document', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose File', onPress: handleUploadFile },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
  };

  const renderDocument = ({ item }: { item: DocumentResponse }) => (
    <TouchableOpacity
      style={[
        styles.documentCard,
        {
          backgroundColor: theme.card,
          borderColor: isDark ? colors.primary[700] : colors.primary[200],
        },
      ]}
      onPress={() => handleViewDocument(item)}
      onLongPress={() => handleDeleteDocument(item)}
    >
      <View style={[styles.documentIcon, { backgroundColor: isDark ? colors.navy[700] : colors.gray[100] }]}>
        <Ionicons name={getFileIcon(item.mime_type) as any} size={24} color={colors.primary[isDark ? 300 : 600]} />
      </View>
      <View style={styles.documentInfo}>
        <Text style={[styles.documentName, { color: theme.text }]} numberOfLines={1}>
          {item.original_filename}
        </Text>
        <View style={styles.documentMeta}>
          <Text style={[styles.documentType, { color: theme.textMuted }]}>
            {DOCUMENT_TYPE_LABELS[item.document_type]}
          </Text>
          <Text style={[styles.documentSize, { color: theme.textMuted }]}>
            {formatFileSize(item.file_size)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]}>Documents</Text>
        <TouchableOpacity onPress={showUploadOptions} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Ionicons name="add" size={28} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Progress */}
      {isUploading && (
        <View style={styles.uploadProgress}>
          <View style={[styles.uploadBar, { width: `${uploadProgress}%` }]} />
          <Text style={styles.uploadText}>Uploading... {uploadProgress}%</Text>
        </View>
      )}

      {/* Document List */}
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Documents</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Upload documents to keep them organized with your properties.
            </Text>
            <TouchableOpacity style={styles.uploadButton} onPress={showUploadOptions}>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: '700' },
  uploadProgress: {
    height: 24,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
  },
  uploadText: { fontSize: 11, fontWeight: '600', color: colors.gray[700] },
  listContent: { padding: 16 },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  documentIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  documentInfo: { flex: 1, marginLeft: 12 },
  documentName: { fontSize: 15, fontWeight: '500' },
  documentMeta: { flexDirection: 'row', marginTop: 4, gap: 12 },
  documentType: { fontSize: 12 },
  documentSize: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, marginHorizontal: 32 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  uploadButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
