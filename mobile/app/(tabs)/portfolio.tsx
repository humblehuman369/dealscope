import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { formatCurrency, formatCompact } from '../../services/analytics';
import {
  usePortfolioProperties,
  usePortfolioSummary,
  useAddPortfolioProperty,
  useDeletePortfolioProperty,
  useDatabaseInit,
} from '../../hooks/useDatabase';
import { PortfolioProperty } from '../../database';
import { useTheme } from '../../context/ThemeContext';

const STRATEGY_OPTIONS = [
  { label: 'Long-Term Rental', value: 'long_term_rental' },
  { label: 'Short-Term Rental', value: 'short_term_rental' },
  { label: 'BRRRR', value: 'brrrr' },
  { label: 'Fix & Flip', value: 'fix_and_flip' },
  { label: 'House Hack', value: 'house_hack' },
  { label: 'Wholesale', value: 'wholesale' },
];

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Database hooks
  const { isReady: dbReady } = useDatabaseInit();
  const { data: properties, isLoading, refetch, isRefetching } = usePortfolioProperties();
  const { data: summary } = usePortfolioSummary();
  const addProperty = useAddPortfolioProperty();
  const deleteProperty = useDeletePortfolioProperty();

  const handleAddProperty = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(true);
  }, []);

  const handleDeleteProperty = useCallback((id: string, address: string) => {
    Alert.alert(
      'Remove Property',
      `Remove "${address}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteProperty.mutate(id);
          },
        },
      ]
    );
  }, [deleteProperty]);

  const handlePropertyPress = useCallback((property: PortfolioProperty) => {
    const fullAddress = [property.address, property.city, property.state]
      .filter(Boolean)
      .join(', ');
    router.push(`/analytics/${encodeURIComponent(fullAddress)}`);
  }, [router]);

  const portfolioSummary = summary || {
    totalProperties: 0,
    totalValue: 0,
    totalEquity: 0,
    monthlyIncome: 0,
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
    summaryCard: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    summaryValue: { color: theme.text },
    summaryLabel: { color: theme.textMuted },
    sectionTitle: { color: theme.text },
    propertyCard: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    propertyAddress: { color: theme.text },
    propertyLocation: { color: theme.textMuted },
    metricLabel: { color: theme.textMuted },
    metricValue: { color: theme.text },
    emptyTitle: { color: theme.text },
    emptyText: { color: theme.textMuted },
    loadingText: { color: theme.textMuted },
  };

  // Loading state
  if (!dbReady || isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading portfolio...</Text>
      </View>
    );
  }

  const hasProperties = properties && properties.length > 0;

  return (
    <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.title, dynamicStyles.title]}>Portfolio</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddProperty}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[600]}
          />
        }
      >
        {/* Portfolio Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, dynamicStyles.summaryCard]}>
            <Ionicons name="home" size={24} color={colors.primary[isDark ? 400 : 600]} />
            <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
              {portfolioSummary.totalProperties}
            </Text>
            <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Properties</Text>
          </View>

          <View style={[styles.summaryCard, dynamicStyles.summaryCard]}>
            <Ionicons name="trending-up" size={24} color={colors.profit.main} />
            <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
              {formatCompact(portfolioSummary.totalValue)}
            </Text>
            <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Total Value</Text>
          </View>

          <View style={[styles.summaryCard, dynamicStyles.summaryCard]}>
            <Ionicons name="cash" size={24} color={colors.info.main} />
            <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
              {formatCurrency(portfolioSummary.monthlyIncome)}
            </Text>
            <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Monthly Income</Text>
          </View>
        </View>

        {/* Property List or Empty State */}
        {hasProperties ? (
          <View style={styles.propertiesList}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Your Properties</Text>
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onPress={() => handlePropertyPress(property)}
                onDelete={() => handleDeleteProperty(property.id, property.address)}
                theme={theme}
                isDark={isDark}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.navy[800] : colors.gray[100] }]}>
              <Ionicons name="briefcase-outline" size={64} color={isDark ? colors.gray[500] : colors.gray[300]} />
            </View>
            <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>Build Your Portfolio</Text>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
              Add properties you've purchased to track your investment performance over time.
            </Text>
            
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddProperty}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.emptyButtonText}>Add Your First Property</Text>
            </TouchableOpacity>

            <View style={styles.featureList}>
              <FeatureItem icon="analytics" text="Track property performance" />
              <FeatureItem icon="pie-chart" text="View portfolio allocation" />
              <FeatureItem icon="calendar" text="Monitor monthly cash flow" />
              <FeatureItem icon="trending-up" text="Measure equity growth" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Property Modal */}
      <AddPropertyModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addProperty.mutate}
        isLoading={addProperty.isPending}
      />
    </View>
  );
}

interface PropertyCardProps {
  property: PortfolioProperty;
  onPress: () => void;
  onDelete: () => void;
  theme: any;
  isDark: boolean;
}

function PropertyCard({ property, onPress, onDelete, theme, isDark }: PropertyCardProps) {
  const purchaseDate = property.purchase_date 
    ? new Date(property.purchase_date * 1000).toLocaleDateString()
    : null;

  return (
    <TouchableOpacity 
      style={[
        styles.propertyCard, 
        { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] }
      ]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardAddressContainer}>
          <Text style={[styles.cardAddress, { color: theme.text }]} numberOfLines={1}>{property.address}</Text>
          <Text style={[styles.cardLocation, { color: theme.textMuted }]}>
            {[property.city, property.state].filter(Boolean).join(', ')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.cardDeleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardMetrics}>
        <View style={styles.cardMetric}>
          <Text style={[styles.cardMetricLabel, { color: theme.textMuted }]}>Purchase Price</Text>
          <Text style={[styles.cardMetricValue, { color: theme.text }]}>
            {property.purchase_price ? formatCurrency(property.purchase_price) : '—'}
          </Text>
        </View>
        <View style={styles.cardMetric}>
          <Text style={[styles.cardMetricLabel, { color: theme.textMuted }]}>Strategy</Text>
          <Text style={[styles.cardMetricValue, { color: theme.text }]}>
            {STRATEGY_OPTIONS.find(s => s.value === property.strategy)?.label || property.strategy || '—'}
          </Text>
        </View>
        <View style={styles.cardMetric}>
          <Text style={[styles.cardMetricLabel, { color: theme.textMuted }]}>Cash Flow</Text>
          <Text style={[
            styles.cardMetricValue,
            { color: property.monthly_cash_flow && property.monthly_cash_flow > 0 
              ? colors.profit.main 
              : colors.loss.main }
          ]}>
            {property.monthly_cash_flow ? formatCurrency(property.monthly_cash_flow) : '—'}
          </Text>
        </View>
      </View>

      {purchaseDate && (
        <Text style={[styles.cardDate, { color: theme.textMuted }]}>Purchased {purchaseDate}</Text>
      )}
    </TouchableOpacity>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={18} color={colors.primary[600]} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

interface AddPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (params: any) => void;
  isLoading: boolean;
}

function AddPropertyModal({ visible, onClose, onAdd, isLoading }: AddPropertyModalProps) {
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [strategy, setStrategy] = useState('');
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);

  const resetForm = useCallback(() => {
    setAddress('');
    setCity('');
    setState('');
    setZip('');
    setPurchasePrice('');
    setStrategy('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please enter the property address.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    onAdd({
      address: address.trim(),
      city: city.trim() || null,
      state: state.trim() || null,
      zip: zip.trim() || null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice.replace(/[^0-9.]/g, '')) : null,
      purchaseDate: Math.floor(Date.now() / 1000),
      strategy: strategy || null,
      propertyData: null,
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleClose();
  }, [address, city, state, zip, purchasePrice, strategy, onAdd, handleClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, { paddingTop: insets.top + 16 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Property</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="123 Main Street"
                placeholderTextColor={colors.gray[400]}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="words"
              />
            </View>

            {/* City, State, Zip Row */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="City"
                  placeholderTextColor={colors.gray[400]}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="FL"
                  placeholderTextColor={colors.gray[400]}
                  value={state}
                  onChangeText={setState}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={styles.inputLabel}>ZIP</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="33401"
                  placeholderTextColor={colors.gray[400]}
                  value={zip}
                  onChangeText={setZip}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Purchase Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Purchase Price</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="450,000"
                  placeholderTextColor={colors.gray[400]}
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Strategy */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Investment Strategy</Text>
              <TouchableOpacity
                style={styles.strategySelector}
                onPress={() => setShowStrategyPicker(!showStrategyPicker)}
              >
                <Text style={[
                  styles.strategySelectorText,
                  !strategy && styles.strategySelectorPlaceholder
                ]}>
                  {STRATEGY_OPTIONS.find(s => s.value === strategy)?.label || 'Select strategy'}
                </Text>
                <Ionicons
                  name={showStrategyPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>

              {showStrategyPicker && (
                <View style={styles.strategyOptions}>
                  {STRATEGY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.strategyOption,
                        strategy === option.value && styles.strategyOptionSelected
                      ]}
                      onPress={() => {
                        setStrategy(option.value);
                        setShowStrategyPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.strategyOptionText,
                        strategy === option.value && styles.strategyOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {strategy === option.value && (
                        <Ionicons name="checkmark" size={20} color={colors.primary[600]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.gray[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontWeight: '700',
    fontSize: 24,
    color: colors.gray[900],
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: {
    fontWeight: '700',
    fontSize: 20,
    color: colors.gray[900],
    marginTop: 8,
    marginBottom: 2,
  },
  summaryLabel: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.gray[700],
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 16,
  },
  propertiesList: {
    gap: 12,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardAddressContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 13,
    color: colors.gray[500],
  },
  cardDeleteButton: {
    padding: 4,
  },
  cardMetrics: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: 12,
  },
  cardMetric: {
    flex: 1,
  },
  cardMetricLabel: {
    fontSize: 13,
    color: colors.gray[700],
    marginBottom: 2,
  },
  cardMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  profitText: {
    color: colors.profit.main,
  },
  lossText: {
    color: colors.loss.main,
  },
  cardDate: {
    fontSize: 13,
    color: colors.gray[700],
    marginTop: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 20,
    color: colors.gray[900],
    marginBottom: 8,
  },
  emptyText: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary[600],
    marginBottom: 32,
  },
  emptyButtonText: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.primary[600],
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontWeight: '500',
    fontSize: 14,
    color: colors.gray[700],
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[900],
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.gray[600],
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
  },
  textInput: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray[900],
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  pricePrefix: {
    fontSize: 16,
    color: colors.gray[500],
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray[900],
  },
  strategySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  strategySelectorText: {
    fontSize: 16,
    color: colors.gray[900],
  },
  strategySelectorPlaceholder: {
    color: colors.gray[400],
  },
  strategyOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    overflow: 'hidden',
  },
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  strategyOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  strategyOptionText: {
    fontSize: 15,
    color: colors.gray[700],
  },
  strategyOptionTextSelected: {
    color: colors.primary[700],
    fontWeight: '500',
  },
});
