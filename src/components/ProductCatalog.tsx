import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Plus, Search, Trash2, Edit2, AlertTriangle, Tag,
  Globe, DollarSign, Package, X, Check, Barcode as BarcodeIcon, Upload, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { processAndUploadProductImage, validateImageFile } from '../utils/imageOptimizer';
import { resolveActivePlan, checkResourceLimit } from '../utils/planLimitsEngine';

export interface PresetItem {
  label: string;
  name: string;
  sku: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  unit: string;
  stock: string;
  url: string;
  description: string;
  barcode?: string;
  duration?: string;
  appointmentRequired?: boolean;
}

export const getBusinessAwarePresets = (industry: string, isService: boolean): PresetItem[] => {
  const ind = (industry || '').toLowerCase().trim();

  if (isService) {
    switch (ind) {
      case 'clothing':
        return [
          { label: '✂️ Alteration', name: 'Custom Garment Alteration & Hemming', sku: 'SRV-ALT', category: 'Alterations', costPrice: '5', sellingPrice: '25', unit: 'Pcs', stock: '0', duration: '30', appointmentRequired: false, url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=150&q=80', description: 'Professional sizing adjustments, hemming, and garment repair services.' },
          { label: '📏 Bespoke Design', name: 'Premium Tailoring Consultation & Measurement', sku: 'SRV-BSP', category: 'Tailoring', costPrice: '0', sellingPrice: '120', unit: 'Session', stock: '0', duration: '60', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150&q=80', description: 'One-on-one personal fitting, measurement, and custom suit/dress layout selection.' }
        ];
      case 'restaurant':
        return [
          { label: '🥂 Table RSVP', name: 'VIP Table Reservation (Champagne Greeting)', sku: 'SRV-RSVP', category: 'Reservations', costPrice: '15', sellingPrice: '80', unit: 'Session', stock: '0', duration: '120', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&q=80', description: 'Table booking for premium dining zones, includes a complementary chef greet and appetizer.' },
          { label: '🍽️ Chef Experience', name: 'Artisanal Multi-Course Chef\'s Table (Per Guest)', sku: 'SRV-CHEF', category: 'Events', costPrice: '45', sellingPrice: '150', unit: 'Session', stock: '0', duration: '180', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&q=80', description: 'A tailored gastronomy experience guided directly by our Head Chef with custom paired drinks.' }
        ];
      case 'salon':
        return [
          { label: '✂️ Hair Styling', name: 'Signature Haircut & Revitalizing Wash', sku: 'SRV-HAIR', category: 'Hair Treatments', costPrice: '5', sellingPrice: '65', unit: 'Session', stock: '0', duration: '45', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=150&q=80', description: 'Includes hair analysis, washing with premium botanicals, master cutting, and blowdry finish.' },
          { label: '💆 Massage / Spa', name: 'Deep Tissue Relaxation Therapy (60 Mins)', sku: 'SRV-MASS', category: 'Facial & Skin Care', costPrice: '12', sellingPrice: '90', unit: 'Session', stock: '0', duration: '60', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&q=80', description: 'Therapeutic full-body oil massage targeting tight muscle groups and promoting mental calm.' },
          { label: '💅 Nail Care', name: 'Luxury Gel Manicure & Hand Massage', sku: 'SRV-NAIL', category: 'Manicure & Pedicure', costPrice: '6', sellingPrice: '45', unit: 'Session', stock: '0', duration: '40', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=150&q=80', description: 'Complete nail shaping, cuticle care, custom organic scrub, and premium long-lasting gel polish.' }
        ];
      case 'repair':
        return [
          { label: '📱 Screen Repair', name: 'Express Smartphone OLED Screen Swap', sku: 'SRV-IPHN', category: 'Repair Labor', costPrice: '25', sellingPrice: '120', unit: 'Service', stock: '0', duration: '45', appointmentRequired: false, url: 'https://images.unsplash.com/photo-1597740985671-2a8a3b80f02e?w=150&q=80', description: 'Replacing damaged glass or OLED screens on standard smartphones with OEM parts.' },
          { label: '💻 OS Tune-up', name: 'Workstation Deep Diagnosis & OS Refactor', sku: 'SRV-COMP', category: 'Diagnosis', costPrice: '0', sellingPrice: '75', unit: 'Service', stock: '0', duration: '60', appointmentRequired: false, url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150&q=80', description: 'Registry cleanup, virus/spyware removal, heat dissipation audit, and system tune-up.' }
        ];
      case 'pharmacy':
        return [
          { label: '🩺 Health Review', name: 'Comprehensive Vitals & Health Assessment', sku: 'SRV-MED', category: 'Services', costPrice: '0', sellingPrice: '45', unit: 'Session', stock: '0', duration: '30', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&q=80', description: 'Blood pressure logging, blood sugar check, weight index, and general lifestyle medicine recommendations.' }
        ];
      default:
        return [
          { label: '📊 Consulting', name: '1-on-1 Strategic Business Advisory Hour', sku: 'SRV-CNS', category: 'Consultation', costPrice: '0', sellingPrice: '150', unit: 'Hour', stock: '0', duration: '60', appointmentRequired: true, url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=150&q=80', description: 'Focused professional consultation to optimize business operations, workflows, and strategy.' },
          { label: '🛠️ General Service', name: 'Standard General Service Labor Block', sku: 'SRV-GEN', category: 'Services', costPrice: '15', sellingPrice: '75', unit: 'Session', stock: '0', duration: '60', appointmentRequired: false, url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&q=80', description: 'General on-demand technical or specialized operational service block.' }
        ];
    }
  } else {
    switch (ind) {
      case 'clothing':
        return [
          { label: '👕 Graphic Tee', name: 'Organic Heavyweight Graphic Cotton Tee', sku: 'PRD-TEE', category: 'Apparel', costPrice: '8', sellingPrice: '35', unit: 'Pcs', stock: '50', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80', description: 'Combed organic ring-spun cotton graphic tee, 220 GSM heavyweight drape.' },
          { label: '👖 Premium Denim', name: 'Selvedge Tailored Indigo Denim Trousers', sku: 'PRD-DNM', category: 'Apparel', costPrice: '25', sellingPrice: '95', unit: 'Pcs', stock: '30', url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=150&q=80', description: '14oz shuttle-loom raw selvedge indigo denim with copper rivet reinforcement.' },
          { label: '👜 Tote Bag', name: 'Waxed Canvas Everyday Field Duffel Bag', sku: 'PRD-BAG', category: 'Accessories', costPrice: '18', sellingPrice: '60', unit: 'Pcs', stock: '20', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150&q=80', description: 'Waterproof waxed cotton canvas tote bag with vegetable-tanned leather straps.' }
        ];
      case 'restaurant':
        return [
          { label: '🍔 Smashed Burger', name: 'Double Smashed Wagyu Cheeseburger', sku: 'PRD-BGR', category: 'Burgers & Mains', costPrice: '4.50', sellingPrice: '14.50', unit: 'Portion', stock: '100', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&q=80', description: 'Two dry-aged wagyu smash patties, double cheddar cheese, heirloom tomato, secret sauce on toasted brioche.' },
          { label: '☕ Special Latte', name: 'Artisanal Micro-Lot Double Shot Latte', sku: 'PRD-LAT', category: 'Beverages', costPrice: '1.20', sellingPrice: '5.50', unit: 'Cup', stock: '200', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&q=80', description: 'Double ristretto espresso poured over velvety steamed local dairy milk with subtle microfoam.' }
        ];
      case 'pharmacy':
        return [
          { label: '💊 Multivitamins', name: 'Premium High-Potency Immune Multivitamins', sku: 'PRD-VIT', category: 'Vitamins & Supplements', costPrice: '12.00', sellingPrice: '29.99', unit: 'Bottle', stock: '60', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&q=80', description: 'A daily formulation rich in Vitamins C, D3, Zinc, and Selenium for optimal immune defense.' }
        ];
      case 'electronics':
        return [
          { label: '🎧 ANC Headphones', name: 'Acoustic Elite Noise-Cancelling Headphones', sku: 'PRD-ANC', category: 'Audio & Headphones', costPrice: '85', sellingPrice: '249', unit: 'Unit', stock: '15', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80', description: 'Hybrid active noise cancellation, high-definition Bluetooth, and up to 45 hours battery life.' },
          { label: '🔋 Travel Powerbank', name: 'Ultra-Compact PD Fast Charging Powerbank', sku: 'PRD-PWR', category: 'Accessories', costPrice: '12', sellingPrice: '39', unit: 'Pcs', stock: '40', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=150&q=80', description: '20,000mAh external battery packs with 22.5W Power Delivery and dual high-speed outputs.' }
        ];
      case 'grocery':
        return [
          { label: '🥚 Farm Eggs', name: 'A-Grade Free-Range Organic Eggs (Dozen)', sku: 'PRD-EGG', category: 'Dairy & Eggs', costPrice: '1.90', sellingPrice: '4.80', unit: 'Box', stock: '120', url: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=150&q=80', description: 'Farm fresh free-range pasture eggs rich in omega-3 and organic nutrients.' },
          { label: '🥛 Fresh Milk', name: 'Whole Cream Organic Local Farm Milk (1L)', sku: 'PRD-MLK', category: 'Dairy & Eggs', costPrice: '1.10', sellingPrice: '2.95', unit: 'Bottle', stock: '80', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=150&q=80', description: 'Pasteurized non-homogenized pure cream cow milk delivered fresh daily.' }
        ];
      default:
        return [
          { label: '📦 Premium Item', name: 'Premium Branded Universal Item Box', sku: 'PRD-ITM', category: 'General Products', costPrice: '8', sellingPrice: '25', unit: 'Pcs', stock: '100', url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&q=80', description: 'Our flagship premium retail and custom business showcase pack.' }
        ];
    }
  }
};

export const ProductCatalog: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    activeBusiness,
    activeUser,
    currency,
    primaryColor,
    activeSubscription,
    subscriptionPlans,
    openCheckoutModal,
  } = useVelcora();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Dynamic Plan Limits Enforcer
  const currentPlan = resolveActivePlan(activeSubscription, subscriptionPlans, activeBusiness);
  const productQuota = checkResourceLimit(currentPlan, 'maxProducts', products.length);

  const isAuthorized = activeUser?.roleId === 'role-owner' || activeUser?.roleId === 'role-manager' || activeUser?.roleId === 'role-admin';

  // Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formCostPrice, setFormCostPrice] = useState('10');
  const [formSellingPrice, setFormSellingPrice] = useState('25');
  const [formStock, setFormStock] = useState('50');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formIsService, setFormIsService] = useState(false);
  const [formDuration, setFormDuration] = useState('60');
  const [formAssignedStaff, setFormAssignedStaff] = useState<string[]>([]);
  const [formAppointmentRequired, setFormAppointmentRequired] = useState(false);
  const [formCommissionRate, setFormCommissionRate] = useState('10');
  const [formRequirements, setFormRequirements] = useState('');
  const [formOnlineStoreActive, setFormOnlineStoreActive] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleProcessFile = async (file: File) => {
    setImageUploadError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageUploadError(validation.error || 'Invalid image file.');
      return;
    }

    // 1. Create and set immediate local object URL preview for instant UI feedback
    const tempUrl = URL.createObjectURL(file);
    setFormImageUrl(tempUrl);

    setIsUploadingImage(true);
    try {
      const result = await processAndUploadProductImage(file, activeBusiness?.id || 'default-biz');
      if (result.success && result.url) {
        setFormImageUrl(result.url);
        setImageUploadError(null);
      } else {
        // If upload/fallback failed entirely, clear preview and show error
        setFormImageUrl('');
        setImageUploadError(result.error || 'Failed to upload product image. Please try again.');
      }
    } catch (err: any) {
      setFormImageUrl('');
      setImageUploadError(err?.message || 'An error occurred during image processing.');
    } finally {
      setIsUploadingImage(false);
      // Revoke temporary object URL to free up browser memory
      try {
        URL.revokeObjectURL(tempUrl);
      } catch (e) {}
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleProcessFile(file);
    e.target.value = ''; // Reset input to allow re-selecting same file
  };

  // Variants in Form
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);

  // Dynamic Industry Archetype Helpers
  const getIndustryArchetype = (): 'pharmacy' | 'fashion' | 'restaurant' | 'electronics' | 'hardware' | 'salon' | 'general' => {
    const ind = (activeBusiness?.industry || '').toLowerCase().trim();
    if (ind === 'pharmacy') return 'pharmacy';
    if (ind === 'clothing' || ind === 'footwear' || ind === 'fashion' || ind === 'cosmetics') return 'fashion';
    if (ind === 'restaurant' || ind === 'cafe' || ind === 'food') return 'restaurant';
    if (ind === 'electronics' || ind === 'mobile_shop' || ind === 'repair') return 'electronics';
    if (ind === 'hardware' || ind === 'furniture') return 'hardware';
    if (ind === 'salon' || ind === 'barber' || ind === 'service') return 'salon';
    return 'general';
  };

  const archetype = getIndustryArchetype();

  // Dynamic state fields for industry-specific inputs
  const [formBrand, setFormBrand] = useState('');
  const [formGenericFormula, setFormGenericFormula] = useState('');
  const [formStrength, setFormStrength] = useState('');
  const [formDosageForm, setFormDosageForm] = useState('Tablet');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formRxRequired, setFormRxRequired] = useState(false);
  const [formStorageInfo, setFormStorageInfo] = useState('');
  
  const [formMaterial, setFormMaterial] = useState('');
  const [formSize, setFormSize] = useState('M');
  const [formColor, setFormColor] = useState('');
  const [formStyle, setFormStyle] = useState('');
  const [formGenderCollection, setFormGenderCollection] = useState('Unisex');
  
  const [formIngredients, setFormIngredients] = useState('');
  const [formPortionSize, setFormPortionSize] = useState('Regular');
  const [formRecipeInstructions, setFormRecipeInstructions] = useState('');
  
  const [formModelNo, setFormModelNo] = useState('');
  const [formSoldSerialNo, setFormSoldSerialNo] = useState('');
  const [formSpecifications, setFormSpecifications] = useState('');
  const [formWarrantyMonths, setFormWarrantyMonths] = useState('');
  const [formCondition, setFormCondition] = useState('New');
  
  const [formDimensions, setFormDimensions] = useState('');
  const [formWeightCapacity, setFormWeightCapacity] = useState('');
  const [formGradeStandards, setFormGradeStandards] = useState('');
  
  const [formSpecialistName, setFormSpecialistName] = useState('');
  const [formServiceType, setFormServiceType] = useState('Hair Care');
  const [formPrepTime, setFormPrepTime] = useState('30');

  const categories = Array.from(new Set(['ALL', ...products.map(p => p.category || 'General')]));

  const filtered = products.filter(p => {
    const matchCat = selectedCat === 'ALL' || (p.category || 'General') === selectedCat;
    const q = search.toLowerCase();
    const matchQ =
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode ? p.barcode.includes(q) : false);
    return matchCat && matchQ;
  });

  const handleOpenAdd = () => {
    if (!productQuota.allowed) {
      setPermissionError(productQuota.errorMessage || `You have reached your ${currentPlan.name} limit of ${productQuota.limit} products. Upgrade your plan to add more.`);
      return;
    }
    setEditingProductId(null);
    setFormName('');
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(`${Math.floor(8900000000 + Math.random() * 10000000)}`);
    
    // Set smart defaults based on selected archetype
    const arch = getIndustryArchetype();
    if (arch === 'pharmacy') {
      setFormCategory('Antibiotics & Analgesics');
      setFormUnit('Box');
    } else if (arch === 'fashion') {
      setFormCategory('Apparel');
      setFormUnit('Pcs');
    } else if (arch === 'restaurant') {
      setFormCategory('Main Courses');
      setFormUnit('Portion');
    } else if (arch === 'electronics') {
      setFormCategory('Devices');
      setFormUnit('Unit');
    } else if (arch === 'hardware') {
      setFormCategory('Tools');
      setFormUnit('Pcs');
    } else if (arch === 'salon') {
      setFormCategory('Beauty Services');
      setFormUnit('Session');
    } else {
      setFormCategory('General');
      setFormUnit('Pcs');
    }

    setFormCostPrice('10');
    setFormSellingPrice('25');
    setFormStock('50');
    setFormMinStock('10');
    const isServiceBiz = activeBusiness?.businessModel === 'service';
    setFormIsService(isServiceBiz || arch === 'salon');
    setFormDuration('60');
    setFormAssignedStaff([]);
    setFormAppointmentRequired(false);
    setFormCommissionRate('10');
    setFormRequirements('');
    setFormOnlineStoreActive(true);
    setFormDescription('');
    setFormImageUrl('');
    setFormVariants([]);

    // Reset dynamic inputs
    setFormBrand('');
    setFormGenericFormula('');
    setFormStrength('');
    setFormDosageForm('Tablet');
    setFormExpiryDate('');
    setFormBatchNumber('');
    setFormRxRequired(false);
    setFormStorageInfo('');
    setFormMaterial('');
    setFormSize('M');
    setFormColor('');
    setFormStyle('');
    setFormGenderCollection('Unisex');
    setFormIngredients('');
    setFormPortionSize('Regular');
    setFormRecipeInstructions('');
    setFormModelNo('');
    setFormSoldSerialNo('');
    setFormSpecifications('');
    setFormWarrantyMonths('');
    setFormCondition('New');
    setFormDimensions('');
    setFormWeightCapacity('');
    setFormGradeStandards('');
    setFormSpecialistName('');
    setFormServiceType('Hair Care');
    setFormPrepTime('30');

    setShowAddModal(true);
  };

  const handleSelectPreset = (preset: PresetItem) => {
    setFormName(preset.name);
    const rand = Math.floor(100 + Math.random() * 900);
    setFormSku(`${preset.sku}-${rand}`);
    setFormBarcode(preset.barcode || `890123${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategory(preset.category);
    setFormCostPrice(preset.costPrice);
    setFormSellingPrice(preset.sellingPrice);
    setFormUnit(preset.unit);
    setFormStock(preset.stock);
    setFormImageUrl(preset.url);
    setFormDescription(preset.description);
    if (preset.duration) {
      setFormDuration(preset.duration);
    }
    if (preset.appointmentRequired !== undefined) {
      setFormAppointmentRequired(preset.appointmentRequired);
    }
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProductId(p.id);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode);
    setFormCategory(p.category);
    setFormCostPrice(p.costPrice.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormStock(p.stock.toString());
    setFormMinStock(p.minStock.toString());
    setFormUnit(p.unit);
    setFormIsService(p.isService || false);
    setFormDuration((p.duration || 60).toString());
    setFormAssignedStaff(p.assignedStaff || []);
    setFormAppointmentRequired(p.appointmentRequired || false);
    setFormCommissionRate((p.commissionRate || 10).toString());
    setFormRequirements(p.requirements || '');
    setFormOnlineStoreActive(p.onlineStoreActive !== false);
    setFormDescription(p.description || '');
    setFormImageUrl(p.imageUrl || '');
    setFormVariants(p.variants || []);

    // Load custom inputs
    setFormBrand(p.brand || '');
    const cVals = p.customFieldValues || {};
    setFormGenericFormula(cVals.generic_formula || '');
    setFormStrength(cVals.strength || '');
    setFormDosageForm(cVals.dosage_form || 'Tablet');
    setFormExpiryDate(cVals.expiry_date || '');
    setFormBatchNumber(cVals.batch_number || '');
    setFormRxRequired(!!cVals.rx_required);
    setFormStorageInfo(cVals.storage_info || '');
    setFormMaterial(cVals.material || '');
    setFormSize(cVals.size || 'M');
    setFormColor(cVals.color || '');
    setFormStyle(cVals.style || '');
    setFormGenderCollection(cVals.gender_collection || 'Unisex');
    setFormIngredients(cVals.ingredients || '');
    setFormPortionSize(cVals.portion_size || 'Regular');
    setFormRecipeInstructions(cVals.recipe_instructions || '');
    setFormModelNo(cVals.model_no || '');
    setFormSoldSerialNo(cVals.sold_serial_no || '');
    setFormSpecifications(cVals.specifications || '');
    setFormWarrantyMonths(cVals.warranty_months || '');
    setFormCondition(cVals.condition || 'New');
    setFormDimensions(cVals.dimensions || '');
    setFormWeightCapacity(cVals.weight_capacity || '');
    setFormGradeStandards(cVals.grade_standards || '');
    setFormSpecialistName(cVals.specialist_name || '');
    setFormServiceType(cVals.service_type || 'Hair Care');
    setFormPrepTime(cVals.prep_time || '30');

    setShowAddModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const customVals: Record<string, any> = {};
    const arch = getIndustryArchetype();

    if (arch === 'pharmacy') {
      customVals.generic_formula = formGenericFormula;
      customVals.strength = formStrength;
      customVals.dosage_form = formDosageForm;
      customVals.expiry_date = formExpiryDate;
      customVals.batch_number = formBatchNumber;
      customVals.rx_required = formRxRequired;
      customVals.storage_info = formStorageInfo;
    } else if (arch === 'fashion') {
      customVals.material = formMaterial;
      customVals.size = formSize;
      customVals.color = formColor;
      customVals.style = formStyle;
      customVals.gender_collection = formGenderCollection;
    } else if (arch === 'restaurant') {
      customVals.ingredients = formIngredients;
      customVals.portion_size = formPortionSize;
      customVals.recipe_instructions = formRecipeInstructions;
    } else if (arch === 'electronics') {
      customVals.model_no = formModelNo;
      customVals.sold_serial_no = formSoldSerialNo;
      customVals.specifications = formSpecifications;
      customVals.warranty_months = formWarrantyMonths;
      customVals.condition = formCondition;
    } else if (arch === 'hardware') {
      customVals.material = formMaterial;
      customVals.dimensions = formDimensions;
      customVals.weight_capacity = formWeightCapacity;
      customVals.grade_standards = formGradeStandards;
    } else if (arch === 'salon') {
      customVals.specialist_name = formSpecialistName;
      customVals.service_type = formServiceType;
      customVals.prep_time = formPrepTime;
    }

    const isServiceItem = formIsService;

    const newProd: Product = {
      id: editingProductId || `prod-${Date.now()}`,
      businessId: activeBusiness.id,
      name: formName.trim(),
      sku: formSku.trim(),
      barcode: formBarcode.trim(),
      brand: formBrand.trim() || undefined,
      category: formCategory.trim() || 'General',
      purchasePrice: isServiceItem ? 0 : (parseFloat(formCostPrice) || 0),
      costPrice: isServiceItem ? 0 : (parseFloat(formCostPrice) || 0),
      sellingPrice: parseFloat(formSellingPrice) || 0,
      taxRate: activeBusiness.taxRateDefault,
      taxInclusive: activeBusiness.taxInclusive,
      unit: isServiceItem ? 'Session' : (formUnit.trim() || 'Pcs'),
      stock: isServiceItem ? 0 : (formVariants.length > 0 ? formVariants.reduce((sum, v) => sum + v.stock, 0) : (parseInt(formStock) || 0)),
      minStock: isServiceItem ? 0 : (parseInt(formMinStock) || 5),
      maxStock: isServiceItem ? 0 : 200,
      warehouseId: 'wh-main',
      isService: isServiceItem,
      enableBatchTracking: false,
      enableSerialTracking: false,
      variants: isServiceItem ? [] : formVariants,
      customFieldValues: customVals,
      status: 'active',
      onlineStoreActive: formOnlineStoreActive,
      description: formDescription.trim(),
      imageUrl: formImageUrl.trim() || undefined,
      // Bookable Service Attributes
      duration: isServiceItem ? (parseInt(formDuration) || 60) : undefined,
      assignedStaff: isServiceItem ? formAssignedStaff : undefined,
      appointmentRequired: isServiceItem ? formAppointmentRequired : undefined,
      commissionRate: isServiceItem ? (parseFloat(formCommissionRate) || 0) : undefined,
      requirements: isServiceItem ? formRequirements.trim() : undefined,
    };

    if (editingProductId) {
      updateProduct(editingProductId, newProd);
    } else {
      if (!productQuota.allowed) {
        setPermissionError(productQuota.errorMessage || `You have reached your ${currentPlan.name} limit of ${productQuota.limit} products. Upgrade your plan to add more.`);
        return;
      }
      addProduct(newProd);
    }
    setShowAddModal(false);
  };

  return (
    <div id="velcora-product-catalog" className="space-y-4">
      {permissionError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{permissionError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCheckoutModal('subscriptions')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs transition"
            >
              Upgrade Plan
            </button>
            <button onClick={() => setPermissionError(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-bold text-xs p-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs text-slate-900 dark:text-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs bg-primary"
          >
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">Products & Catalog Master</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                productQuota.remaining <= 0
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {products.length} / {productQuota.limit.toLocaleString()} items ({currentPlan.name})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">{products.length} catalog items managed</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {productQuota.remaining <= 0 && (
            <button
              onClick={() => openCheckoutModal('subscriptions')}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Expand Quota</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition active:scale-98 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/60 focus:border-[#2563EB] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const isSel = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  isSel
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1E2E4A]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Item Details</th>
                <th className="py-3.5 px-4">SKU / Barcode</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Cost Price</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">In Stock</th>
                <th className="py-3.5 px-4">Online</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1E2E4A]/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-[#1F2E4D] bg-slate-100 dark:bg-[#0B1220]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-[#94A3B8]">
                          {p.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs sm:text-sm">{p.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-[#94A3B8]">
                    <div className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{p.sku}</div>
                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]/70">{p.barcode}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#0B1220] text-slate-700 dark:text-[#94A3B8] font-semibold text-[11px] border border-slate-200 dark:border-[#1F2E4D]">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-500 dark:text-[#94A3B8]">
                    {VelcoraPricingEngine.formatCurrency(p.costPrice, currency)}
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs sm:text-sm">
                    {VelcoraPricingEngine.formatCurrency(p.sellingPrice, currency)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                        p.stock <= p.minStock
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/35'
                          : 'bg-slate-100 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#1F2E4D]'
                      }`}
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.onlineStoreActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        <Globe className="w-3 h-3" /> Synced
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]/60">Hidden</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {deleteConfirmId === p.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded-xl border border-rose-200 dark:border-rose-900/40">
                          <button
                            onClick={() => {
                              if (!isAuthorized) {
                                setPermissionError("You do not have permission to delete products. Only Owners or Managers can delete records.");
                                setTimeout(() => setPermissionError(null), 5000);
                                setDeleteConfirmId(null);
                                return;
                              }
                              deleteProduct(p.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-1.5 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-[#FB7185] hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-[#1F2E4D] shadow-2xl overflow-hidden text-slate-900 dark:text-[#F8FAFC]"
          >
            <div className="p-5 border-b border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between bg-slate-50 dark:bg-[#0B1220]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" style={{ color: primaryColor }} />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">
                  {editingProductId ? 'Edit Catalog Product' : 'Add New Catalog Product'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#1E2E4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Hybrid Business Model Toggle */}
              {activeBusiness?.businessModel === 'hybrid' && (
                <div className="bg-slate-100 dark:bg-[#0B1220] p-1 rounded-xl flex border border-slate-200/60 dark:border-[#1F2E4D]">
                  <button
                    type="button"
                    onClick={() => setFormIsService(false)}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[11px] transition ${
                      !formIsService
                        ? 'bg-white dark:bg-[#1E2E4A] shadow-xs text-slate-900 dark:text-[#F8FAFC] font-extrabold'
                        : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    📦 Physical Inventory Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormIsService(true)}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[11px] transition ${
                      formIsService
                        ? 'bg-white dark:bg-[#1E2E4A] shadow-xs text-slate-900 dark:text-[#F8FAFC] font-extrabold'
                        : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    💇 Bookable Service
                  </button>
                </div>
              )}

              {formIsService ? (
                /* SERVICE FIELDS BLOCK */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                        Service / Appointment Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="e.g. Bridal Makeup, Dental Scaling, Oil Change & Tuning"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] focus:border-[#2563EB] focus:outline-hidden text-slate-900 dark:text-[#F8FAFC] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Service Category</label>
                      <input
                        type="text"
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        placeholder="e.g. Skin Treatment, Consulting"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Duration (Minutes) *</label>
                      <input
                        type="number"
                        required
                        value={formDuration}
                        onChange={e => setFormDuration(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-mono focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Selling Price ({currency}) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formSellingPrice}
                        onChange={e => setFormSellingPrice(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-mono font-bold focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Staff Commission Rate (%)</label>
                      <input
                        type="number"
                        value={formCommissionRate}
                        onChange={e => setFormCommissionRate(e.target.value)}
                        placeholder="e.g. 15"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-mono focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Assigned Staff / Specialist List</label>
                      <input
                        type="text"
                        value={formAssignedStaff.join(', ')}
                        onChange={e => setFormAssignedStaff(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. Stylist Sarah, Dr. Emily, Mechanic Ali (comma separated)"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="formAppointmentRequired"
                        checked={formAppointmentRequired}
                        onChange={e => setFormAppointmentRequired(e.target.checked)}
                        className="w-4 h-4 rounded-md text-primary focus:ring-primary border-slate-300"
                      />
                      <label htmlFor="formAppointmentRequired" className="font-bold text-slate-700 dark:text-[#94A3B8] select-none">
                        Prior Appointment booking is strictly required
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Special Requirements / Instructions</label>
                      <textarea
                        value={formRequirements}
                        onChange={e => setFormRequirements(e.target.value)}
                        rows={2}
                        placeholder="e.g. Bring diagnostic report; do not wash face before treatment."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* PRODUCT FIELDS BLOCK */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                        {archetype === 'pharmacy' ? 'Medicine / Product Name *' : archetype === 'restaurant' ? 'Item Name *' : archetype === 'salon' ? 'Service / Item Name *' : 'Product Title *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder={
                          archetype === 'pharmacy' ? 'e.g. Amoxicillin 500mg, Paracetamol Extra' :
                          archetype === 'restaurant' ? 'e.g. Truffle Mushroom Risotto, Margherita Pizza' :
                          archetype === 'salon' ? 'e.g. Balayage Hair Highlights, Deep Facial Treatment' :
                          archetype === 'fashion' ? 'e.g. Premium Linen Summer Dress, Denim Jeans' :
                          archetype === 'electronics' ? 'e.g. iPhone 15 Pro, Noise-Canceling Headphones' :
                          archetype === 'hardware' ? 'e.g. Heavy-Duty Wood Screws, Stanley Claw Hammer' :
                          'e.g. Classic Cotton Henley Shirt'
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] focus:border-[#2563EB] focus:outline-hidden text-slate-900 dark:text-[#F8FAFC] font-semibold"
                      />
                    </div>

                    {/* INDUSTRY-AWARE SECURE BRAIN SCHEMA FIELDS */}
                    <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F2E4D] pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-[#94A3B8]">
                            Velcora Brain • {archetype.toUpperCase()} Schema
                          </span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                          Context Isolation Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Archetype-Specific Inputs */}
                        {archetype === 'pharmacy' && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Brand / Manufacturer</label>
                              <input
                                type="text"
                                value={formBrand}
                                onChange={e => setFormBrand(e.target.value)}
                                placeholder="e.g. GlaxoSmithKline, Pfizer, Abbott"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Generic Formula</label>
                              <input
                                type="text"
                                value={formGenericFormula}
                                onChange={e => setFormGenericFormula(e.target.value)}
                                placeholder="e.g. Acetaminophen, Amoxicillin"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Strength</label>
                              <input
                                type="text"
                                value={formStrength}
                                onChange={e => setFormStrength(e.target.value)}
                                placeholder="e.g. 500mg, 10ml, 5%"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Dosage Form</label>
                              <select
                                value={formDosageForm}
                                onChange={e => setFormDosageForm(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              >
                                {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Suspension'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Batch Number</label>
                              <input
                                type="text"
                                value={formBatchNumber}
                                onChange={e => setFormBatchNumber(e.target.value)}
                                placeholder="e.g. BATCH-2026A"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Expiry Date</label>
                              <input
                                type="text"
                                value={formExpiryDate}
                                onChange={e => setFormExpiryDate(e.target.value)}
                                placeholder="e.g. 12/2028, 2026-11-30"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Storage Information</label>
                              <input
                                type="text"
                                value={formStorageInfo}
                                onChange={e => setFormStorageInfo(e.target.value)}
                                placeholder="e.g. Keep under 25°C"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="rxRequired"
                                checked={formRxRequired}
                                onChange={e => setFormRxRequired(e.target.checked)}
                                className="w-4 h-4 rounded-md text-primary focus:ring-primary border-slate-300"
                              />
                              <label htmlFor="rxRequired" className="font-bold text-slate-700 dark:text-[#94A3B8] select-none">
                                Prescription Required (Rx)
                              </label>
                            </div>
                          </>
                        )}

                        {archetype === 'fashion' && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Brand / Label</label>
                              <input
                                type="text"
                                value={formBrand}
                                onChange={e => setFormBrand(e.target.value)}
                                placeholder="e.g. Zara, Nike, Gucci, Adidas"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Material / Fabric</label>
                              <input
                                type="text"
                                value={formMaterial}
                                onChange={e => setFormMaterial(e.target.value)}
                                placeholder="e.g. 100% Cotton, Linen Blend"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Size Selection</label>
                              <select
                                value={formSize}
                                onChange={e => setFormSize(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              >
                                {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Color / Wash</label>
                              <input
                                type="text"
                                value={formColor}
                                onChange={e => setFormColor(e.target.value)}
                                placeholder="e.g. Navy Blue, Indigo"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Style Code / Cut</label>
                              <input
                                type="text"
                                value={formStyle}
                                onChange={e => setFormStyle(e.target.value)}
                                placeholder="e.g. Slim Fit, Relaxed Fit"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Collection Segment</label>
                              <select
                                value={formGenderCollection}
                                onChange={e => setFormGenderCollection(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              >
                                {['Men', 'Women', 'Unisex', 'Kids', 'Athletic'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {archetype === 'restaurant' && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Supplier / Sourced From</label>
                              <input
                                type="text"
                                value={formBrand}
                                onChange={e => setFormBrand(e.target.value)}
                                placeholder="e.g. Sysco, Local Farm Collective"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Ingredients & Allergens</label>
                              <input
                                type="text"
                                value={formIngredients}
                                onChange={e => setFormIngredients(e.target.value)}
                                placeholder="e.g. Wheat, Dairy, Nuts, Gluten-Free"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Portion/Serving Size</label>
                              <select
                                value={formPortionSize}
                                onChange={e => setFormPortionSize(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              >
                                {['Regular', 'Small', 'Medium', 'Large', 'Double', 'Family Pack'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Recipe / Culinary Notes</label>
                              <input
                                type="text"
                                value={formRecipeInstructions}
                                onChange={e => setFormRecipeInstructions(e.target.value)}
                                placeholder="e.g. Serve hot with lime wedge"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                          </>
                        )}

                        {archetype === 'electronics' && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Brand</label>
                              <input
                                type="text"
                                value={formBrand}
                                onChange={e => setFormBrand(e.target.value)}
                                placeholder="e.g. Apple, Sony, Samsung, Dell"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Model / Part No.</label>
                              <input
                                type="text"
                                value={formModelNo}
                                onChange={e => setFormModelNo(e.target.value)}
                                placeholder="e.g. A2849, WH-1000XM4"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Serial / IMEI</label>
                              <input
                                type="text"
                                value={formSoldSerialNo}
                                onChange={e => setFormSoldSerialNo(e.target.value)}
                                placeholder="e.g. IMEI-358291001"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Technical Specs</label>
                              <input
                                type="text"
                                value={formSpecifications}
                                onChange={e => setFormSpecifications(e.target.value)}
                                placeholder="e.g. 16GB RAM, 512GB SSD, M2 Chip"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Warranty (Months)</label>
                              <input
                                type="number"
                                value={formWarrantyMonths}
                                onChange={e => setFormWarrantyMonths(e.target.value)}
                                placeholder="e.g. 12"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Item Condition</label>
                              <select
                                value={formCondition}
                                onChange={e => setFormCondition(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              >
                                {['New', 'Refurbished', 'Used-Excellent', 'Used-Fair'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {archetype === 'hardware' && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Manufacturer</label>
                              <input
                                type="text"
                                value={formBrand}
                                onChange={e => setFormBrand(e.target.value)}
                                placeholder="e.g. DeWalt, Stanley, Makita, Bosch"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Material Composition</label>
                              <input
                                type="text"
                                value={formMaterial}
                                onChange={e => setFormMaterial(e.target.value)}
                                placeholder="e.g. Galvanized Steel, Tempered Alloy"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Dimensions</label>
                              <input
                                type="text"
                                value={formDimensions}
                                onChange={e => setFormDimensions(e.target.value)}
                                placeholder="e.g. 4ft x 8ft, 1/2 inch x 3 inch"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Weight Capacity</label>
                              <input
                                type="text"
                                value={formWeightCapacity}
                                onChange={e => setFormWeightCapacity(e.target.value)}
                                placeholder="e.g. Up to 250 lbs"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Grade Standards</label>
                              <input
                                type="text"
                                value={formGradeStandards}
                                onChange={e => setFormGradeStandards(e.target.value)}
                                placeholder="e.g. ANSI Grade 1"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                          </>
                        )}

                        {archetype === 'salon' && (
                          <>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Stylist / Specialist Name</label>
                              <input
                                type="text"
                                value={formSpecialistName}
                                onChange={e => setFormSpecialistName(e.target.value)}
                                placeholder="e.g. Stylist Sarah, Dr. Emily"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Service Type</label>
                              <select
                                value={formServiceType}
                                onChange={e => setFormServiceType(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              >
                                {['Hair Care', 'Nail Care', 'Skincare / Facial', 'Makeup Artistry', 'Massage Therapy', 'Spa Package', 'Consultation'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Preparation Time (Mins)</label>
                              <input
                                type="number"
                                value={formPrepTime}
                                onChange={e => setFormPrepTime(e.target.value)}
                                placeholder="e.g. 30, 45"
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                              />
                            </div>
                          </>
                        )}

                        {archetype === 'general' && (
                          <div className="sm:col-span-2">
                            <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">Brand / Sourced From</label>
                            <input
                              type="text"
                              value={formBrand}
                              onChange={e => setFormBrand(e.target.value)}
                              placeholder="e.g. General Sourcing Ltd."
                              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">SKU *</label>
                      <input
                        type="text"
                        required
                        value={formSku}
                        onChange={e => setFormSku(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-mono text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Barcode</label>
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={e => setFormBarcode(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-mono text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Category</label>
                      <input
                        type="text"
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        placeholder="e.g. Apparel"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Unit</label>
                      <input
                        type="text"
                        value={formUnit}
                        onChange={e => setFormUnit(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Cost Price ({currency})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostPrice}
                        onChange={e => setFormCostPrice(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-mono text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Selling Price ({currency}) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formSellingPrice}
                        onChange={e => setFormSellingPrice(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-mono font-bold text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Opening Stock</label>
                      <input
                        type="number"
                        value={formStock}
                        onChange={e => setFormStock(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Low Stock Warning Point</label>
                      <input
                        type="number"
                        value={formMinStock}
                        onChange={e => setFormMinStock(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* Product Image / Photo (for BOTH products & services) */}
              <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8]">Item Showcase Photo</label>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP (Max 15MB)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={e => {
                      setFormImageUrl(e.target.value);
                      setImageUploadError(null);
                    }}
                    placeholder="Paste image URL or upload photo from device..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] focus:border-[#2563EB] focus:outline-hidden text-slate-900 dark:text-[#F8FAFC] text-sm"
                  />
                  <label
                    className={`px-3.5 py-2 rounded-xl text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
                      isUploadingImage ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover'
                    }`}
                  >
                    {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Upload className="w-4 h-4" />}
                    <span>{isUploadingImage ? 'Processing...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif"
                      onChange={handleImageFileUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {imageUploadError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{imageUploadError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUploadError(null)}
                      className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}

                {formImageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-white dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                    <img
                      src={formImageUrl}
                      alt="Item preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-[#1F2E4D]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&q=80';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-[#94A3B8] truncate">Visual Showcase Added</p>
                      <p className="text-[10px] text-slate-400 truncate">{formImageUrl.startsWith('data:') ? 'Optimized Local Image' : formImageUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageUrl('');
                        setImageUploadError(null);
                      }}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 p-1"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Preset Options adapted to Service vs Product */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-[#94A3B8]">
                      Dynamic Business Presets (Click to autofill all fields):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {getBusinessAwarePresets(activeBusiness?.industry || '', formIsService).map(preset => {
                      const isSel = formImageUrl === preset.url && formName === preset.name;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          title={`Autofill: ${preset.name} (${preset.category})`}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                            isSel
                              ? 'bg-primary border-primary text-white font-bold'
                              : 'bg-white dark:bg-[#111C30] border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1E2E4A] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-[#1F2E4D] bg-slate-50 dark:bg-[#0B1220] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-xs"
              >
                Save Product to Catalog
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
