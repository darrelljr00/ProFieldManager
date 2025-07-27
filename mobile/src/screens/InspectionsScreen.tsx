import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Card, Button, TextInput, Checkbox, RadioButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ApiService } from '../services/ApiService';

interface InspectionItem {
  id: string;
  question: string;
  type: 'checkbox' | 'radio' | 'text';
  options?: string[];
  required: boolean;
}

const INSPECTION_ITEMS: InspectionItem[] = [
  {
    id: 'vehicle_condition',
    question: 'Overall vehicle condition',
    type: 'radio',
    options: ['Excellent', 'Good', 'Fair', 'Poor'],
    required: true,
  },
  {
    id: 'tire_pressure',
    question: 'Tire pressure check completed',
    type: 'checkbox',
    required: true,
  },
  {
    id: 'fluid_levels',
    question: 'All fluid levels checked',
    type: 'checkbox',
    required: true,
  },
  {
    id: 'lights_working',
    question: 'All lights functioning properly',
    type: 'checkbox',
    required: true,
  },
  {
    id: 'equipment_secure',
    question: 'Equipment properly secured',
    type: 'checkbox',
    required: true,
  },
  {
    id: 'safety_equipment',
    question: 'Safety equipment present and functional',
    type: 'checkbox',
    required: true,
  },
  {
    id: 'fuel_level',
    question: 'Fuel level',
    type: 'radio',
    options: ['Full', '3/4', '1/2', '1/4', 'Low'],
    required: true,
  },
  {
    id: 'mileage',
    question: 'Current mileage reading',
    type: 'text',
    required: true,
  },
  {
    id: 'notes',
    question: 'Additional notes or observations',
    type: 'text',
    required: false,
  },
];

export default function InspectionsScreen({ navigation }: any) {
  const [inspectionType, setInspectionType] = useState<'pre-trip' | 'post-trip'>('pre-trip');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResponseChange = (itemId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const validateForm = () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter a vehicle number');
      return false;
    }

    const requiredItems = INSPECTION_ITEMS.filter(item => item.required);
    const missingResponses = requiredItems.filter(item => !responses[item.id]);

    if (missingResponses.length > 0) {
      Alert.alert(
        'Incomplete Inspection',
        `Please complete all required items: ${missingResponses.map(item => item.question).join(', ')}`
      );
      return false;
    }

    return true;
  };

  const submitInspection = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const inspectionData = {
        type: inspectionType,
        vehicleNumber: vehicleNumber.trim(),
        responses,
        timestamp: new Date().toISOString(),
      };

      await ApiService.post('/api/inspections', inspectionData);

      Alert.alert(
        'Inspection Submitted',
        `${inspectionType === 'pre-trip' ? 'Pre-trip' : 'Post-trip'} inspection for vehicle ${vehicleNumber} has been submitted successfully.`,
        [
          {
            text: 'New Inspection',
            onPress: resetForm,
          },
          {
            text: 'View History',
            onPress: () => navigation.navigate('InspectionHistory'),
          },
        ]
      );
    } catch (error) {
      console.error('Inspection submission error:', error);
      Alert.alert('Error', 'Failed to submit inspection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setVehicleNumber('');
    setResponses({});
  };

  const renderInspectionItem = (item: InspectionItem) => {
    switch (item.type) {
      case 'checkbox':
        return (
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={responses[item.id] ? 'checked' : 'unchecked'}
              onPress={() => handleResponseChange(item.id, !responses[item.id])}
            />
            <Text style={styles.checkboxLabel}>{item.question}</Text>
            {item.required && <Text style={styles.required}>*</Text>}
          </View>
        );

      case 'radio':
        return (
          <View style={styles.radioContainer}>
            <Text style={styles.radioLabel}>
              {item.question}
              {item.required && <Text style={styles.required}> *</Text>}
            </Text>
            <RadioButton.Group
              onValueChange={(value) => handleResponseChange(item.id, value)}
              value={responses[item.id] || ''}
            >
              {item.options?.map((option) => (
                <View key={option} style={styles.radioOption}>
                  <RadioButton value={option} />
                  <Text style={styles.radioOptionText}>{option}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </View>
        );

      case 'text':
        return (
          <TextInput
            label={`${item.question}${item.required ? ' *' : ''}`}
            value={responses[item.id] || ''}
            onChangeText={(value) => handleResponseChange(item.id, value)}
            mode="outlined"
            style={styles.textInput}
            multiline={item.id === 'notes'}
            numberOfLines={item.id === 'notes' ? 3 : 1}
            keyboardType={item.id === 'mileage' ? 'numeric' : 'default'}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerContent}>
              <Icon name="clipboard-check" size={32} color="#2563eb" />
              <Text style={styles.headerTitle}>Vehicle Inspection</Text>
            </View>

            <View style={styles.typeSelector}>
              <Text style={styles.typeSelectorLabel}>Inspection Type:</Text>
              <RadioButton.Group
                onValueChange={(value) => setInspectionType(value as 'pre-trip' | 'post-trip')}
                value={inspectionType}
              >
                <View style={styles.typeOptions}>
                  <View style={styles.typeOption}>
                    <RadioButton value="pre-trip" />
                    <Text style={styles.typeOptionText}>Pre-Trip</Text>
                  </View>
                  <View style={styles.typeOption}>
                    <RadioButton value="post-trip" />
                    <Text style={styles.typeOptionText}>Post-Trip</Text>
                  </View>
                </View>
              </RadioButton.Group>
            </View>

            <TextInput
              label="Vehicle Number *"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              mode="outlined"
              style={styles.vehicleInput}
              placeholder="Enter vehicle number"
            />
          </Card.Content>
        </Card>

        <Card style={styles.inspectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Inspection Items</Text>
            {INSPECTION_ITEMS.map((item) => (
              <View key={item.id} style={styles.inspectionItem}>
                {renderInspectionItem(item)}
              </View>
            ))}
          </Card.Content>
        </Card>

        <View style={styles.disclaimer}>
          <Icon name="information" size={20} color="#dc2626" />
          <Text style={styles.disclaimerText}>
            By submitting this inspection, I acknowledge that this information is accurate and 
            will be reviewed by management. False reporting may result in disciplinary action.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={resetForm}
            style={styles.resetButton}
            disabled={isSubmitting}
          >
            Reset Form
          </Button>
          <Button
            mode="contained"
            onPress={submitInspection}
            style={styles.submitButton}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Submit Inspection
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  typeOptions: {
    flexDirection: 'row',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  typeOptionText: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 8,
  },
  vehicleInput: {
    backgroundColor: 'white',
  },
  inspectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  inspectionItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  radioContainer: {
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioOptionText: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: 'white',
  },
  required: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  resetButton: {
    flex: 0.45,
  },
  submitButton: {
    flex: 0.45,
  },
});