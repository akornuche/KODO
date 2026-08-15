<template>
  <div class="courier-onboarding">
    <div class="onboarding-header">
      <h1>Become a KODO Courier 🚗</h1>
      <p>Complete these steps to start delivering and earning</p>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar">
      <div
        v-for="step in steps"
        :key="step.step"
        :class="['progress-step', {
          completed: step.completed,
          active: currentStep === step.step,
        }]"
      >
        <div class="step-number">
          <span v-if="step.completed">✓</span>
          <span v-else>{{ step.step }}</span>
        </div>
        <div class="step-info">
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <!-- Step 1: Personal & Vehicle Information -->
      <div v-if="currentStep === 1" class="step-form">
        <h2>Personal & Vehicle Information</h2>
        <p class="step-description">
          Tell us about yourself and your vehicle. This helps us match you with suitable deliveries.
        </p>

        <h3 class="section-title">Personal Information</h3>
        
        <div class="form-group">
          <label>Full Name *</label>
          <input
            v-model="form.fullName"
            type="text"
            placeholder="Enter your full name"
            required
          />
        </div>

        <div class="form-group">
          <label>Phone Number *</label>
          <input
            v-model="form.phoneNumber"
            type="tel"
            placeholder="e.g., 08012345678"
            pattern="[0-9]{11}"
            maxlength="11"
            required
          />
          <p class="field-hint">Enter your 11-digit Nigerian phone number</p>
        </div>

        <div class="form-group">
          <label>Date of Birth *</label>
          <input
            v-model="form.dateOfBirth"
            type="date"
            :max="maxDateOfBirth"
            required
          />
          <p class="field-hint">You must be at least 18 years old</p>
        </div>

        <div class="form-group">
          <label>Government ID Type *</label>
          <select v-model="form.governmentIdType" required>
            <option value="">Select ID Type</option>
            <option value="NIN">National Identity Number (NIN)</option>
            <option value="BVN">Bank Verification Number (BVN)</option>
            <option value="DRIVERS_LICENSE">Driver's License</option>
            <option value="VOTERS_CARD">Voter's Card</option>
            <option value="PASSPORT">International Passport</option>
          </select>
        </div>

        <div class="form-group">
          <label>Government ID Number *</label>
          <input
            v-model="form.governmentIdNumber"
            type="text"
            placeholder="Enter ID number"
            required
          />
        </div>

        <h3 class="section-title">Vehicle Information</h3>

        <div class="form-group">
          <label>Vehicle Type *</label>
          <select v-model="form.vehicleType" required>
            <option value="">Select Vehicle Type</option>
            <option value="BICYCLE">Bicycle</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="TRICYCLE">Tricycle (Keke)</option>
            <option value="CAR">Car</option>
            <option value="VAN">Van</option>
            <option value="TRUCK">Truck</option>
          </select>
        </div>

        <div class="form-group">
          <label>Vehicle Make & Model *</label>
          <input
            v-model="form.vehicleModel"
            type="text"
            placeholder="e.g., TVS Apache, Toyota Corolla"
            required
          />
        </div>

        <div class="form-group">
          <label>Vehicle Plate Number *</label>
          <input
            v-model="form.vehiclePlateNumber"
            type="text"
            placeholder="e.g., ABC-123-XY"
            required
          />
        </div>

        <div class="form-group">
          <label>Vehicle Year *</label>
          <input
            v-model.number="form.vehicleYear"
            type="number"
            :min="1990"
            :max="new Date().getFullYear()"
            placeholder="e.g., 2020"
            required
          />
        </div>

        <div class="form-group">
          <label>Vehicle Color *</label>
          <input
            v-model="form.vehicleColor"
            type="text"
            placeholder="e.g., Black, Blue"
            required
          />
        </div>

        <div class="form-actions">
          <button
            @click="savePersonalVehicleInfo"
            :disabled="!isStep1Valid || saving"
            class="btn-primary"
          >
            {{ saving ? 'Saving...' : 'Next: Service Areas' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Service Areas & Routes -->
      <div v-if="currentStep === 2" class="step-form">
        <h2>Service Areas & Routes</h2>
        <p class="step-description">
          Define where you want to deliver. Choose local zones or inter-city routes.
        </p>

        <div class="service-type-tabs">
          <button
            :class="['tab-btn', { active: serviceTab === 'local' }]"
            @click="serviceTab = 'local'"
          >
            🏘️ Local Delivery
          </button>
          <button
            :class="['tab-btn', { active: serviceTab === 'intercity' }]"
            @click="serviceTab = 'intercity'"
          >
            🛣️ Inter-City
          </button>
        </div>

        <!-- Local Delivery Areas -->
        <div v-if="serviceTab === 'local'" class="service-tab-content">
          <h3>Local Delivery Zones</h3>
          <p class="tab-description">Select the local areas where you can deliver</p>

          <div class="form-group">
            <label>State *</label>
            <select v-model="localForm.state" @change="onStateChange">
              <option value="">Select State</option>
              <option v-for="state in nigerianStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>

          <div v-if="localForm.state" class="form-group">
            <label>City/LGA *</label>
            <input
              v-model="localForm.city"
              type="text"
              placeholder="e.g., Ikeja, Surulere"
              required
            />
          </div>

          <div v-if="localForm.city" class="form-group">
            <label>Specific Zones (Optional)</label>
            <input
              v-model="localForm.zone"
              type="text"
              placeholder="e.g., VI, Lekki, Ajah"
            />
            <p class="field-hint">Leave empty to cover the entire city/LGA</p>
          </div>

          <div class="form-group">
            <label>Maximum Delivery Radius (km)</label>
            <input
              v-model.number="localForm.radius"
              type="number"
              min="5"
              max="50"
              placeholder="e.g., 10"
            />
            <p class="field-hint">How far are you willing to travel for deliveries?</p>
          </div>

          <button
            @click="addLocalArea"
            :disabled="!localForm.state || !localForm.city || saving"
            class="btn-add"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Local Area
          </button>

          <div v-if="localAreas.length > 0" class="areas-list">
            <h4>Added Local Areas</h4>
            <div
              v-for="(area, index) in localAreas"
              :key="index"
              class="area-card"
            >
              <div class="area-info">
                <strong>{{ area.city }}, {{ area.state }}</strong>
                <span v-if="area.zone"> - {{ area.zone }}</span>
                <span class="area-radius">{{ area.radius }}km radius</span>
              </div>
              <button @click="removeLocalArea(index)" class="btn-remove">Remove</button>
            </div>
          </div>
        </div>

        <!-- Inter-City Routes -->
        <div v-if="serviceTab === 'intercity'" class="service-tab-content">
          <h3>Inter-City Routes</h3>
          <p class="tab-description">Add the routes you're willing to travel between cities/states</p>

          <div class="form-row">
            <div class="form-group">
              <label>From State *</label>
              <select v-model="routeForm.fromState">
                <option value="">Select State</option>
                <option v-for="state in nigerianStates" :key="state" :value="state">
                  {{ state }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>From City *</label>
              <input
                v-model="routeForm.fromCity"
                type="text"
                placeholder="e.g., Lagos"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>To State *</label>
              <select v-model="routeForm.toState">
                <option value="">Select State</option>
                <option v-for="state in nigerianStates" :key="state" :value="state">
                  {{ state }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>To City *</label>
              <input
                v-model="routeForm.toCity"
                type="text"
                placeholder="e.g., Ibadan"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>Estimated Duration (hours) *</label>
            <input
              v-model.number="routeForm.estimatedDuration"
              type="number"
              min="1"
              max="24"
              placeholder="e.g., 3"
              required
            />
          </div>

          <button
            @click="addRoute"
            :disabled="!isRouteFormValid || saving"
            class="btn-add"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Route
          </button>

          <div v-if="routes.length > 0" class="areas-list">
            <h4>Added Routes</h4>
            <div
              v-for="(route, index) in routes"
              :key="index"
              class="area-card"
            >
              <div class="area-info">
                <strong>{{ route.fromCity }}, {{ route.fromState }}</strong>
                <span class="route-arrow">→</span>
                <strong>{{ route.toCity }}, {{ route.toState }}</strong>
                <span class="area-radius">~{{ route.estimatedDuration }}hrs</span>
              </div>
              <button @click="removeRoute(index)" class="btn-remove">Remove</button>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 1" class="btn-secondary">Back</button>
          <button
            @click="saveServiceAreas"
            :disabled="(localAreas.length === 0 && routes.length === 0) || saving"
            class="btn-primary"
          >
            {{ saving ? 'Saving...' : 'Next: Documents' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Documents & Guarantor -->
      <div v-if="currentStep === 3" class="step-form">
        <h2>Documents & Guarantor</h2>
        <p class="step-description">
          Upload required documents for verification. All documents are securely stored.
        </p>

        <h3 class="section-title">Required Documents</h3>

        <div class="documents-grid">
          <div
            v-for="docType in requiredDocuments"
            :key="docType.type"
            class="document-upload-card"
          >
            <div class="document-header">
              <h4>{{ docType.label }}</h4>
              <span v-if="docType.required" class="required-badge">Required</span>
            </div>
            <p class="document-hint">{{ docType.hint }}</p>
            
            <input
              :ref="`fileInput_${docType.type}`"
              type="file"
              :accept="docType.accept"
              @change="handleFileUpload(docType.type, $event)"
              style="display: none"
            />

            <div v-if="documents[docType.type]" class="document-preview">
              <div class="preview-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>{{ documents[docType.type].name }}</span>
              </div>
              <button @click="removeDocument(docType.type)" class="btn-remove-doc">
                Remove
              </button>
            </div>

            <button
              v-else
              @click="$refs[`fileInput_${docType.type}`][0].click()"
              class="btn-upload"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload {{ docType.label }}
            </button>
          </div>
        </div>

        <h3 class="section-title">Guarantor Information</h3>
        <p class="field-hint">Provide details of someone who can vouch for you</p>

        <div class="form-group">
          <label>Guarantor Full Name *</label>
          <input
            v-model="guarantorForm.fullName"
            type="text"
            placeholder="Enter guarantor's full name"
            required
          />
        </div>

        <div class="form-group">
          <label>Guarantor Phone Number *</label>
          <input
            v-model="guarantorForm.phoneNumber"
            type="tel"
            placeholder="e.g., 08012345678"
            pattern="[0-9]{11}"
            maxlength="11"
            required
          />
        </div>

        <div class="form-group">
          <label>Guarantor Email (Optional)</label>
          <input
            v-model="guarantorForm.email"
            type="email"
            placeholder="guarantor@example.com"
          />
        </div>

        <div class="form-group">
          <label>Guarantor Address *</label>
          <textarea
            v-model="guarantorForm.address"
            placeholder="Enter guarantor's full address"
            rows="3"
            required
          ></textarea>
        </div>

        <div class="form-group">
          <label>Relationship with Guarantor *</label>
          <select v-model="guarantorForm.relationship" required>
            <option value="">Select Relationship</option>
            <option value="FAMILY">Family Member</option>
            <option value="FRIEND">Friend</option>
            <option value="EMPLOYER">Employer</option>
            <option value="COLLEAGUE">Colleague</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 2" class="btn-secondary">Back</button>
          <button
            @click="saveDocumentsGuarantor"
            :disabled="!isStep3Valid || saving"
            class="btn-primary"
          >
            {{ saving ? 'Saving...' : 'Next: Availability' }}
          </button>
        </div>
      </div>

      <!-- Step 4: Availability & Preferences -->
      <div v-if="currentStep === 4" class="step-form">
        <h2>Availability & Preferences</h2>
        <p class="step-description">
          Set your working hours and delivery preferences
        </p>

        <h3 class="section-title">Weekly Availability</h3>
        <p class="field-hint">Select the days and times you're available for deliveries</p>

        <div class="availability-grid">
          <div
            v-for="day in daysOfWeek"
            :key="day.value"
            class="day-availability"
          >
            <label class="day-checkbox">
              <input
                type="checkbox"
                v-model="availability[day.value].available"
              />
              <span class="day-name">{{ day.label }}</span>
            </label>

            <div v-if="availability[day.value].available" class="time-inputs">
              <input
                v-model="availability[day.value].startTime"
                type="time"
                placeholder="Start"
              />
              <span>to</span>
              <input
                v-model="availability[day.value].endTime"
                type="time"
                placeholder="End"
              />
            </div>
          </div>
        </div>

        <h3 class="section-title">Delivery Preferences</h3>

        <div class="form-group">
          <label>Maximum Deliveries Per Day</label>
          <input
            v-model.number="preferences.maxDeliveriesPerDay"
            type="number"
            min="1"
            max="20"
            placeholder="e.g., 10"
          />
          <p class="field-hint">How many deliveries can you handle in a day?</p>
        </div>

        <div class="form-group">
          <label>Maximum Package Weight (kg)</label>
          <input
            v-model.number="preferences.maxPackageWeight"
            type="number"
            min="1"
            max="100"
            placeholder="e.g., 20"
          />
          <p class="field-hint">What's the maximum weight you can carry?</p>
        </div>

        <div class="form-group">
          <label>Preferred Delivery Types</label>
          <div class="checkbox-group">
            <label class="checkbox-option">
              <input
                type="checkbox"
                value="DOCUMENT"
                v-model="preferences.preferredTypes"
              />
              <span>Documents</span>
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                value="SMALL_PACKAGE"
                v-model="preferences.preferredTypes"
              />
              <span>Small Packages</span>
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                value="LARGE_PACKAGE"
                v-model="preferences.preferredTypes"
              />
              <span>Large Packages</span>
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                value="FRAGILE"
                v-model="preferences.preferredTypes"
              />
              <span>Fragile Items</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="preferences.acceptCashOnDelivery"
            />
            <span>Accept Cash on Delivery orders</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="preferences.acceptInstantDelivery"
            />
            <span>Accept instant/express delivery requests</span>
          </label>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 3" class="btn-secondary">Back</button>
          <button
            @click="completeOnboarding"
            :disabled="!isStep4Valid || saving"
            class="btn-primary"
          >
            {{ saving ? 'Completing...' : 'Complete Onboarding' }}
          </button>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="completed" class="completion-message">
        <div class="success-icon">🎉</div>
        <h2>Congratulations!</h2>
        <p>Your courier application has been submitted for review.</p>
        <p class="review-notice">
          Our team will review your application and verify your documents within 1-2 business days.
          You'll receive a notification once approved.
        </p>
        <button @click="goToDashboard" class="btn-primary">Go to Dashboard</button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

export default {
  name: 'CourierOnboarding',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    const currentStep = ref(1);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const completed = ref(false);
    const serviceTab = ref('local');

    const steps = ref([
      {
        step: 1,
        title: 'Personal & Vehicle',
        description: 'Basic information',
        completed: false,
      },
      {
        step: 2,
        title: 'Service Areas',
        description: 'Where you deliver',
        completed: false,
      },
      {
        step: 3,
        title: 'Documents',
        description: 'Verification',
        completed: false,
      },
      {
        step: 4,
        title: 'Availability',
        description: 'Schedule & preferences',
        completed: false,
      },
    ]);

    // Step 1: Personal & Vehicle
    const form = reactive({
      fullName: '',
      phoneNumber: '',
      dateOfBirth: '',
      governmentIdType: '',
      governmentIdNumber: '',
      vehicleType: '',
      vehicleModel: '',
      vehiclePlateNumber: '',
      vehicleYear: null,
      vehicleColor: '',
    });

    // Step 2: Service Areas
    const localForm = reactive({
      state: '',
      city: '',
      zone: '',
      radius: 10,
    });

    const routeForm = reactive({
      fromState: '',
      fromCity: '',
      toState: '',
      toCity: '',
      estimatedDuration: null,
    });

    const localAreas = ref([]);
    const routes = ref([]);

    // Step 3: Documents & Guarantor
    const documents = ref({});
    
    const guarantorForm = reactive({
      fullName: '',
      phoneNumber: '',
      email: '',
      address: '',
      relationship: '',
    });

    const requiredDocuments = [
      {
        type: 'PROFILE_PHOTO',
        label: 'Profile Photo',
        hint: 'Clear photo of your face',
        accept: 'image/*',
        required: true,
      },
      {
        type: 'GOVERNMENT_ID',
        label: 'Government ID',
        hint: 'NIN, Driver\'s License, or Passport',
        accept: 'image/*,.pdf',
        required: true,
      },
      {
        type: 'VEHICLE_PHOTO',
        label: 'Vehicle Photo',
        hint: 'Clear photo of your vehicle',
        accept: 'image/*',
        required: true,
      },
      {
        type: 'DRIVERS_LICENSE',
        label: 'Driver\'s License',
        hint: 'Valid driver\'s license (if applicable)',
        accept: 'image/*,.pdf',
        required: false,
      },
      {
        type: 'VEHICLE_REGISTRATION',
        label: 'Vehicle Registration',
        hint: 'Vehicle registration papers',
        accept: 'image/*,.pdf',
        required: true,
      },
      {
        type: 'INSURANCE',
        label: 'Insurance',
        hint: 'Vehicle insurance (optional)',
        accept: 'image/*,.pdf',
        required: false,
      },
    ];

    // Step 4: Availability & Preferences
    const daysOfWeek = [
      { value: 'MONDAY', label: 'Monday' },
      { value: 'TUESDAY', label: 'Tuesday' },
      { value: 'WEDNESDAY', label: 'Wednesday' },
      { value: 'THURSDAY', label: 'Thursday' },
      { value: 'FRIDAY', label: 'Friday' },
      { value: 'SATURDAY', label: 'Saturday' },
      { value: 'SUNDAY', label: 'Sunday' },
    ];

    const availability = ref({
      MONDAY: { available: false, startTime: '08:00', endTime: '18:00' },
      TUESDAY: { available: false, startTime: '08:00', endTime: '18:00' },
      WEDNESDAY: { available: false, startTime: '08:00', endTime: '18:00' },
      THURSDAY: { available: false, startTime: '08:00', endTime: '18:00' },
      FRIDAY: { available: false, startTime: '08:00', endTime: '18:00' },
      SATURDAY: { available: false, startTime: '08:00', endTime: '18:00' },
      SUNDAY: { available: false, startTime: '08:00', endTime: '18:00' },
    });

    const preferences = reactive({
      maxDeliveriesPerDay: 10,
      maxPackageWeight: 20,
      preferredTypes: [],
      acceptCashOnDelivery: true,
      acceptInstantDelivery: true,
    });

    const nigerianStates = [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
      'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
      'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
      'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
      'Yobe', 'Zamfara',
    ];

    const user = computed(() => authStore.user);

    const maxDateOfBirth = computed(() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 18);
      return date.toISOString().split('T')[0];
    });

    const isStep1Valid = computed(() => {
      return form.fullName && form.phoneNumber && form.dateOfBirth &&
             form.governmentIdType && form.governmentIdNumber &&
             form.vehicleType && form.vehicleModel && form.vehiclePlateNumber &&
             form.vehicleYear && form.vehicleColor;
    });

    const isRouteFormValid = computed(() => {
      return routeForm.fromState && routeForm.fromCity &&
             routeForm.toState && routeForm.toCity && routeForm.estimatedDuration;
    });

    const isStep3Valid = computed(() => {
      const requiredDocs = requiredDocuments.filter(d => d.required);
      const hasAllRequiredDocs = requiredDocs.every(d => documents.value[d.type]);
      const hasGuarantor = guarantorForm.fullName && guarantorForm.phoneNumber &&
                           guarantorForm.address && guarantorForm.relationship;
      return hasAllRequiredDocs && hasGuarantor;
    });

    const isStep4Valid = computed(() => {
      const hasAvailability = Object.values(availability.value).some(day => day.available);
      return hasAvailability && preferences.maxDeliveriesPerDay && preferences.maxPackageWeight;
    });

    // Step 1: Save Personal & Vehicle Info
    const savePersonalVehicleInfo = async () => {
      try {
        error.value = null;
        saving.value = true;

        await api.post('/courier-onboarding/personal-info', form);

        steps.value[0].completed = true;
        currentStep.value = 2;
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to save information';
      } finally {
        saving.value = false;
      }
    };

    // Step 2: Service Areas Management
    const onStateChange = () => {
      localForm.city = '';
      localForm.zone = '';
    };

    const addLocalArea = async () => {
      try {
        error.value = null;
        saving.value = true;

        const response = await api.post('/courier-onboarding/service-areas/local', {
          state: localForm.state,
          city: localForm.city,
          zone: localForm.zone || null,
          radius: localForm.radius,
        });

        localAreas.value.push(response.data.area);
        
        // Reset form
        Object.assign(localForm, {
          state: '',
          city: '',
          zone: '',
          radius: 10,
        });
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to add local area';
      } finally {
        saving.value = false;
      }
    };

    const removeLocalArea = async (index) => {
      const area = localAreas.value[index];
      try {
        if (area.id) {
          await api.delete(`/courier-onboarding/service-areas/local/${area.id}`);
        }
        localAreas.value.splice(index, 1);
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to remove area';
      }
    };

    const addRoute = async () => {
      try {
        error.value = null;
        saving.value = true;

        const response = await api.post('/courier-onboarding/routes', {
          fromState: routeForm.fromState,
          fromCity: routeForm.fromCity,
          toState: routeForm.toState,
          toCity: routeForm.toCity,
          estimatedDuration: routeForm.estimatedDuration,
        });

        routes.value.push(response.data.route);
        
        // Reset form
        Object.assign(routeForm, {
          fromState: '',
          fromCity: '',
          toState: '',
          toCity: '',
          estimatedDuration: null,
        });
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to add route';
      } finally {
        saving.value = false;
      }
    };

    const removeRoute = async (index) => {
      const route = routes.value[index];
      try {
        if (route.id) {
          await api.delete(`/courier-onboarding/routes/${route.id}`);
        }
        routes.value.splice(index, 1);
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to remove route';
      }
    };

    const saveServiceAreas = async () => {
      steps.value[1].completed = true;
      currentStep.value = 3;
    };

    // Step 3: Documents & Guarantor
    const handleFileUpload = async (docType, event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error.value = 'File size must be less than 5MB';
        return;
      }

      try {
        error.value = null;
        saving.value = true;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', docType);

        const response = await api.post('/courier-onboarding/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        documents.value[docType] = {
          name: file.name,
          url: response.data.url,
        };
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to upload document';
      } finally {
        saving.value = false;
      }
    };

    const removeDocument = async (docType) => {
      try {
        await api.delete(`/courier-onboarding/documents/${docType}`);
        delete documents.value[docType];
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to remove document';
      }
    };

    const saveDocumentsGuarantor = async () => {
      try {
        error.value = null;
        saving.value = true;

        await api.post('/courier-onboarding/guarantor', guarantorForm);

        steps.value[2].completed = true;
        currentStep.value = 4;
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to save guarantor information';
      } finally {
        saving.value = false;
      }
    };

    // Step 4: Availability & Complete
    const completeOnboarding = async () => {
      try {
        error.value = null;
        saving.value = true;

        // Save availability
        await api.post('/courier-onboarding/availability', {
          availability: availability.value,
        });

        // Save preferences
        await api.post('/courier-onboarding/preferences', preferences);

        // Complete courier-specific onboarding
        await api.post('/courier-onboarding/complete');
        
        // Update general onboarding status
        await api.post('/onboarding/complete', { role: 'courier' });

        steps.value[3].completed = true;
        completed.value = true;

        // Update user in store
        await authStore.fetchUser();
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to complete onboarding';
      } finally {
        saving.value = false;
      }
    };

    const goToDashboard = () => {
      router.push('/dashboard');
    };

    // Load saved progress
    const loadOnboardingStatus = async () => {
      try {
        loading.value = true;
        const response = await api.get('/courier-onboarding/status');
        
        if (response.data.completedSteps) {
          const completedSteps = response.data.completedSteps;
          
          if (completedSteps.personalInfo) {
            Object.assign(form, completedSteps.personalInfo);
            steps.value[0].completed = true;
            currentStep.value = 2;
          }
          
          if (completedSteps.serviceAreas) {
            localAreas.value = completedSteps.serviceAreas.local || [];
            routes.value = completedSteps.serviceAreas.routes || [];
            steps.value[1].completed = true;
            currentStep.value = 3;
          }

          if (completedSteps.documents) {
            documents.value = completedSteps.documents;
          }

          if (completedSteps.guarantor) {
            Object.assign(guarantorForm, completedSteps.guarantor);
            steps.value[2].completed = true;
            currentStep.value = 4;
          }

          if (completedSteps.availability) {
            availability.value = completedSteps.availability;
          }

          if (completedSteps.preferences) {
            Object.assign(preferences, completedSteps.preferences);
          }
        }
      } catch (err) {
        console.error('Error loading onboarding status:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadOnboardingStatus();
    });

    return {
      currentStep,
      steps,
      loading,
      saving,
      error,
      completed,
      serviceTab,
      form,
      localForm,
      routeForm,
      localAreas,
      routes,
      documents,
      guarantorForm,
      requiredDocuments,
      daysOfWeek,
      availability,
      preferences,
      nigerianStates,
      user,
      maxDateOfBirth,
      isStep1Valid,
      isRouteFormValid,
      isStep3Valid,
      isStep4Valid,
      savePersonalVehicleInfo,
      onStateChange,
      addLocalArea,
      removeLocalArea,
      addRoute,
      removeRoute,
      saveServiceAreas,
      handleFileUpload,
      removeDocument,
      saveDocumentsGuarantor,
      completeOnboarding,
      goToDashboard,
    };
  },
};
</script>

<style scoped>
/* Base styles similar to BuyerOnboarding but with courier-specific adjustments */
.courier-onboarding {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.onboarding-header {
  text-align: center;
  margin-bottom: 3rem;
}

.onboarding-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.onboarding-header p {
  color: #6b7280;
  font-size: 1.1rem;
}

/* Progress Bar */
.progress-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3rem;
  position: relative;
}

.progress-bar::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 5%;
  right: 5%;
  height: 2px;
  background: #e5e7eb;
  z-index: -1;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 0.5rem;
  transition: all 0.3s;
}

.progress-step.active .step-number {
  background: #10b981;
  color: white;
}

.progress-step.completed .step-number {
  background: #10b981;
  color: white;
}

.step-info h3 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #1f2937;
}

.step-info p {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Step Content */
.step-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.step-form h2 {
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.step-description {
  color: #6b7280;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  color: #1f2937;
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

/* Form Styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #10b981;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-hint {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Service Type Tabs */
.service-type-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: #f3f4f6;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e5e7eb;
}

.tab-btn.active {
  background: #ecfdf5;
  border-color: #10b981;
  color: #10b981;
}

.service-tab-content h3 {
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.tab-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

/* Areas List */
.areas-list {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.areas-list h4 {
  margin-bottom: 1rem;
  color: #1f2937;
}

.area-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.area-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.route-arrow {
  color: #10b981;
  font-weight: bold;
  margin: 0 0.5rem;
}

.area-radius {
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Documents Grid */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.document-upload-card {
  padding: 1.5rem;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.document-upload-card:hover {
  border-color: #10b981;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.document-header h4 {
  margin: 0;
  color: #1f2937;
  font-size: 0.95rem;
}

.required-badge {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.document-hint {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.document-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f3f4f6;
  border-radius: 6px;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
  font-size: 0.875rem;
}

.preview-info svg {
  color: #10b981;
}

.btn-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-upload:hover {
  background: #059669;
}

.btn-remove-doc {
  padding: 0.25rem 0.75rem;
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-remove-doc:hover {
  text-decoration: underline;
}

/* Availability Grid */
.availability-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.day-availability {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.day-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.day-checkbox input {
  margin-right: 0.75rem;
  width: 18px;
  height: 18px;
}

.day-name {
  font-weight: 500;
  color: #1f2937;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-inputs input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-option input {
  margin-right: 0.5rem;
  width: auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 0.5rem;
  width: auto;
}

/* Buttons */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary,
.btn-add,
.btn-remove {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
}

.btn-primary {
  background: #10b981;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #10b981;
  color: white;
  margin-top: 1rem;
}

.btn-add:hover:not(:disabled) {
  background: #059669;
}

.btn-add:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-remove {
  background: none;
  color: #dc2626;
  padding: 0.5rem 1rem;
}

.btn-remove:hover {
  background: #fee2e2;
}

/* Completion Message */
.completion-message {
  text-align: center;
  padding: 3rem;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.completion-message h2 {
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.completion-message p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.review-notice {
  background: #eff6ff;
  padding: 1rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  color: #1e40af;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .courier-onboarding {
    padding: 1rem;
  }

  .progress-bar {
    flex-direction: column;
    gap: 1rem;
  }

  .progress-bar::before {
    display: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .documents-grid {
    grid-template-columns: 1fr;
  }

  .day-availability {
    grid-template-columns: 1fr;
  }

  .checkbox-group {
    grid-template-columns: 1fr;
  }

  .service-type-tabs {
    flex-direction: column;
  }
}
</style>
