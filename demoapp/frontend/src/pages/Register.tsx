import {
  createElement,
  useState,
  useEffect,
  useNavigate,
  Link,
} from "@minireact";
import TwoFASetupForm from "@components/TwoFASetupForm";

type FormData = {
  firstName: string;
  lastName: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
  gdprConsent: boolean;
};

type ValidationError = {
  field: keyof FormData | "general";
  message: string;
};

type FormField = {
  name: keyof FormData;
  label: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  pattern?: string;
  title?: string;
  autoFocus?: boolean;
};

type TwoFAData = {
  qrCode: string;
  secret: string;
  email: string;
} | null;

export default function Register() {
  const navigate = useNavigate();

  const formFields: FormField[] = [
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      required: true,
      autoComplete: "given-name",
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      required: true,
      autoComplete: "family-name",
    },
    {
      name: "username",
      label: "Username",
      type: "text",
      required: true,
      autoComplete: "username",
      minLength: 2,
    },
    {
      name: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      autoComplete: "display-name",
      minLength: 2,
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      autoComplete: "email",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      autoComplete: "new-password",
      minLength: 8,
    },
    {
      name: "confirmPassword",
      label: "Confirm Password",
      type: "password",
      required: true,
      autoComplete: "new-password",
    },
    {
      name: "twoFactorEnabled",
      label: "Enable 2FA",
      type: "checkbox",
    },
    {
      name: "gdprConsent",
      label: "I agree to the processing of my personal data",
      type: "checkbox",
      required: true,
    },
  ];

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    twoFactorEnabled: false,
    gdprConsent: false,
  });

  const [errors, _setErrors] = useState<ValidationError[]>([]);

  const setErrors = (
    value: ValidationError[] | ((prev: ValidationError[]) => ValidationError[])
  ) => {
    if (typeof value === "function") {
      _setErrors(prev => {
        try {
          const result = value(Array.isArray(prev) ? prev : []);
          return Array.isArray(result) ? result : [];
        } catch (e) {
          console.error("Error in setErrors function:", e);
          return [];
        }
      });
    } else {
      _setErrors(Array.isArray(value) ? value : []);
    }
  };

  const getErrors = (): ValidationError[] => {
    return Array.isArray(errors) ? errors : [];
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [twoFAData, setTwoFAData] = useState<TwoFAData>(null);
  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{2,20}$/;
    const displayNameRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\- ]{2,20}$/;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~]{8,}$/;
    formFields.forEach(field => {
      const fieldValue =
        typeof formData[field.name] === "string"
          ? (formData[field.name] as string).trim()
          : formData[field.name];
      if (field.required && !fieldValue) {
        newErrors.push({
          field: field.name,
          message: `${field.label} is required`,
        });
      }
    });
    if (formData.firstName && !nameRegex.test(formData.firstName)) {
      newErrors.push({
        field: "firstName",
        message:
          "First name must contain only letters, spaces, hyphens, and apostrophes",
      });
    }
    if (formData.lastName && !nameRegex.test(formData.lastName)) {
      newErrors.push({
        field: "lastName",
        message:
          "Last name must contain only letters, spaces, hyphens, and apostrophes",
      });
    }
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.push({
        field: "email",
        message: "Please enter a valid email address",
      });
    }
    if (formData.username && !usernameRegex.test(formData.username)) {
      newErrors.push({
        field: "username",
        message:
          "Username must be 3-20 characters and can only contain letters, numbers, and underscores",
      });
    }
    if (formData.displayName && !displayNameRegex.test(formData.displayName)) {
      newErrors.push({
        field: "displayName",
        message:
          "Display name must be 2-20 characters and can only contain letters, spaces, hyphens, and apostrophes",
      });
    }
    if (formData.password && !passwordRegex.test(formData.password)) {
      newErrors.push({
        field: "password",
        message:
          "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.push({
        field: "confirmPassword",
        message: "Passwords do not match",
      });
    }
    if (!formData.gdprConsent) {
      newErrors.push({
        field: "gdprConsent",
        message:
          "You must agree to the processing of your personal data to register",
      });
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    const currentIndex = formFields.findIndex(field => field.name === name);
    if (currentIndex < formFields.length - 1) {
      const nextFieldName = formFields[currentIndex + 1].name;
      const nextInput = document.querySelector(
        `[name="${nextFieldName}"]`
      ) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    } else if (currentIndex === formFields.length - 1) {
      (
        document.querySelector("button[type='submit']") as HTMLButtonElement
      )?.focus();
    }
    const currentErrors = getErrors();
    if (currentErrors.length > 0) {
      setErrors(currentErrors.filter(error => error.field !== name));
    }
  };
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          displayName: formData.displayName,
          email: formData.email,
          password: formData.password,
          twoFactorEnabled: formData.twoFactorEnabled,
          gdprConsent: formData.gdprConsent,
        }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Registration failed");
      }
      const data = responseData.data;
      if (formData.twoFactorEnabled && data.qrCode && data.secret) {
        setTwoFAData({
          qrCode: data.qrCode,
          secret: data.secret,
          email: formData.email,
        });
      } else {
        setSubmitSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (error) {
      setErrors([
        {
          field: "general",
          message:
            error instanceof Error
              ? error.message
              : "An error occurred during registration",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASetupComplete = (data: any) => {
    if (!data.success) {
      setErrors([
        { field: "general", message: data.message || "Failed to enable 2FA" },
      ]);
      return;
    }
    setTwoFAData(null);
    setSubmitSuccess(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  const handle2FASetupCancel = () => {
    setTwoFAData(null);
    setSubmitSuccess(true);
    setTimeout(() => navigate("/login"), 1000);
  };
  useEffect(() => {
    const firstInput = document.querySelector(
      `[name="${formFields[0].name}"]`
    ) as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }, []);

  if (twoFAData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="mt-8 space-y-6">
            <TwoFASetupForm
              qrCode={twoFAData.qrCode}
              secret={twoFAData.secret}
              email={twoFAData.email}
              onSuccess={handle2FASetupComplete}
              onCancel={handle2FASetupCancel}
            />
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 text-green-400">✓</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Registration successful! Redirecting to login...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm themed-text-secondary">
          Or{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="themed-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {submitSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300">
                Registration successful! Please check your email to verify your
                account.
              </p>
            </div>
          )}

          {getErrors().some((e: ValidationError) => e.field === "general") && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">
                {
                  getErrors().find(
                    (e: ValidationError) => e.field === "general"
                  )?.message
                }
              </p>
            </div>
          )}

          {!submitSuccess && (
            <form
              className="mt-8 space-y-6"
              noValidate
              onSubmit={(e: Event) => {
                e.preventDefault();
                handleSubmit(e);
              }}
            >
              {formFields.map((field, index) => (
                <div key={field.name} className={index !== 0 ? "mt-4" : ""}>
                  {field.type !== "checkbox" &&
                    field.name !== "gdprConsent" && (
                      <label
                        htmlFor={field.name}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                    )}
                  <div className="mt-1">
                    {field.type === "checkbox" ? (
                      field.name === "gdprConsent" ? (
                        <div className="flex items-start">
                          <input
                            id={field.name}
                            name={field.name}
                            type="checkbox"
                            checked={formData[field.name] as boolean}
                            onChange={handleChange}
                            className="h-4 w-4 min-h-4 min-w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1 flex-shrink-0"
                          />
                          <div className="ml-3">
                            <label
                              htmlFor={field.name}
                              className="text-sm font-medium themed-text-primary"
                            >
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              By checking this box, you consent to the
                              collection, processing, and storage of your
                              personal data as described in our{" "}
                              <Link
                                to="/privacy-policy"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                target="_blank"
                              >
                                Privacy Policy
                              </Link>
                              . This consent is required to create your account
                              and use our services.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <input
                            id={field.name}
                            name={field.name}
                            type="checkbox"
                            checked={formData[field.name] as boolean}
                            onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={field.name}
                            className="ml-2 block text-sm font-medium sm:text-sm"
                          >
                            {field.label}
                          </label>
                        </div>
                      )
                    ) : (
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        autoComplete={field.autoComplete}
                        required={field.required}
                        minLength={field.minLength}
                        pattern={field.pattern}
                        title={field.title}
                        value={formData[field.name] as string}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    )}
                  </div>
                  {getErrors().some(
                    (e: ValidationError) => e.field === field.name
                  ) && (
                    <p className="mt-2 text-sm text-red-600">
                      {
                        getErrors().find(
                          (e: ValidationError) => e.field === field.name
                        )?.message
                      }
                    </p>
                  )}
                </div>
              ))}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting
                      ? "bg-indigo-400"
                      : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          )}

          {!submitSuccess && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 themed-bg themed-text-secondary">
                    Already have an account?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium themed-text-primary themed-bg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
