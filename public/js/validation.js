/**
 * Inline Field Validation Framework
 * Provides real-time validation feedback for form fields
 */

class FieldValidator {
  constructor(fieldId, validatorFn, errorContainerId = null) {
    this.field = document.getElementById(fieldId);
    this.errorContainer = errorContainerId ? document.getElementById(errorContainerId) : null;
    this.validatorFn = validatorFn;
    this.errorElement = null;
    
    if (this.field) {
      this.setupListeners();
    }
  }

  setupListeners() {
    this.field.addEventListener('blur', () => this.validate());
    this.field.addEventListener('input', () => {
      if (this.field.classList.contains('is-invalid')) {
        this.validate();
      }
    });
  }

  validate() {
    const error = this.validatorFn(this.field.value);
    
    if (error) {
      this.showError(error);
      return false;
    } else {
      this.clearError();
      return true;
    }
  }

  showError(message) {
    this.field.classList.remove('is-valid');
    this.field.classList.add('is-invalid');
    
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
    } else if (!this.errorElement) {
      this.errorElement = document.createElement('small');
      this.errorElement.className = 'invalid-feedback d-block mt-1';
      this.errorElement.textContent = message;
      this.field.parentNode.appendChild(this.errorElement);
    } else {
      this.errorElement.textContent = message;
    }
  }

  clearError() {
    this.field.classList.remove('is-invalid');
    this.field.classList.add('is-valid');
    
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    } else if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }
  }

  getValue() {
    return this.field ? this.field.value : null;
  }
}

// Validation Functions
const validators = {
  email: (value) => {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email address';
    }
    return null;
  },

  phone: (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length < 10) {
      return 'Phone must be at least 10 digits';
    }
    if (digits.length > 12) {
      return 'Phone is too long';
    }
    return null;
  },

  password: (value) => {
    if (!value || value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  },

  passwordOptional: (value) => {
    if (!value) return null; // Optional field
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  },

  required: (value) => {
    if (!value || !value.trim()) {
      return 'This field is required';
    }
    return null;
  },

  deliveryAddress: (value) => {
    if (!value || value.trim().length < 10) {
      return 'Delivery address must be at least 10 characters';
    }
    return null;
  },

  quantity: (value, maxAvailable = Infinity) => {
    const qty = parseInt(value);
    if (!Number.isFinite(qty) || qty < 1) {
      return 'Quantity must be at least 1';
    }
    if (qty > maxAvailable) {
      return `Only ${maxAvailable} units available`;
    }
    return null;
  },

  confirmPassword: (value, originalPassword) => {
    if (value !== originalPassword) {
      return 'Passwords do not match';
    }
    return null;
  }
};

// Form Validator - validates entire form
class FormValidator {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.fields = [];
    this.errors = {};
    
    if (this.form) {
      this.setupFormListeners();
    }
  }

  addField(fieldValidator) {
    this.fields.push(fieldValidator);
  }

  setupFormListeners() {
    this.form.addEventListener('submit', (e) => {
      if (!this.validateAll()) {
        e.preventDefault();
        this.showErrorSummary();
      }
    });
  }

  validateAll() {
    this.errors = {};
    let isValid = true;
    
    for (const field of this.fields) {
      if (!field.validate()) {
        isValid = false;
        if (field.field) {
          this.errors[field.field.id] = field.errorElement?.textContent || 'Invalid';
        }
      }
    }
    
    return isValid;
  }

  showErrorSummary() {
    const summary = document.querySelector('.validation-error-summary');
    if (summary && Object.keys(this.errors).length > 0) {
      const errorList = Object.values(this.errors).join('<br>');
      summary.innerHTML = `<i class="fa-solid fa-exclamation-circle"></i> ${errorList}`;
      summary.style.display = 'block';
      summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  clearErrorSummary() {
    const summary = document.querySelector('.validation-error-summary');
    if (summary) {
      summary.style.display = 'none';
    }
  }

  isValid() {
    return this.validateAll();
  }
}

// Initialize validators for common forms
document.addEventListener('DOMContentLoaded', () => {
  // Register Form Validation
  if (document.getElementById('registerForm')) {
    const registerForm = new FormValidator('registerForm');
    registerForm.addField(new FieldValidator('fullName', validators.required));
    registerForm.addField(new FieldValidator('email', validators.email));
    registerForm.addField(new FieldValidator('phone', validators.phone));
    registerForm.addField(new FieldValidator('password', validators.password));
  }

  // Login Form Validation
  if (document.getElementById('loginForm')) {
    const loginForm = new FormValidator('loginForm');
    loginForm.addField(new FieldValidator('login', validators.required));
    loginForm.addField(new FieldValidator('password', validators.required));
  }

  // Profile Edit Form Validation
  if (document.getElementById('profileEditForm')) {
    const profileForm = new FormValidator('profileEditForm');
    profileForm.addField(new FieldValidator('fullName', validators.required));
    profileForm.addField(new FieldValidator('email', validators.email));
    profileForm.addField(new FieldValidator('phone', validators.phone));
    profileForm.addField(new FieldValidator('password', validators.passwordOptional));
  }

  // Checkout Form Validation
  if (document.getElementById('checkoutForm')) {
    const checkoutForm = new FormValidator('checkoutForm');
    checkoutForm.addField(new FieldValidator('deliveryAddress', validators.deliveryAddress));
  }

  // Forgot Password Form Validation
  if (document.getElementById('forgotPasswordForm')) {
    const forgotForm = new FormValidator('forgotPasswordForm');
    forgotForm.addField(new FieldValidator('email', validators.email));
  }

  // Password Reset Form Validation
  if (document.getElementById('resetPasswordForm')) {
    const resetForm = new FormValidator('resetPasswordForm');
    const passwordField = new FieldValidator('password', validators.password);
    const confirmPasswordField = new FieldValidator('confirmPassword', (value) => {
      const pwd = document.getElementById('password').value;
      return validators.confirmPassword(value, pwd);
    });
    resetForm.addField(passwordField);
    resetForm.addField(confirmPasswordField);
  }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldValidator, FormValidator, validators };
}
