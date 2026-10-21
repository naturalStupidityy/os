import { useState } from "react"
import { Link } from "react-router-dom"
import { UserPlus, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Phone, Mail, User, Building2, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registrationApi } from "@/lib/api"

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const UNITS = [
  "Unit A", "Unit B", "Unit C", "Unit D", "Unit E",
  "Unit F", "Unit G", "Unit H", "Medical Unit", "Logistics Unit",
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    gender: "" as "male" | "female" | "other" | "",
    unit: "",
    designation: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Phone number is required";
    } else if (!/^\d{10,15}$/.test(formData.mobileNumber.replace(/\D/g, ""))) {
      newErrors.mobileNumber = "Enter a valid 10-15 digit phone number";
    }
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.unit) newErrors.unit = "Unit assignment is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const data = await registrationApi.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        mobileNumber: formData.mobileNumber.replace(/\D/g, ""),
        gender: formData.gender as "male" | "female" | "other",
        unit: formData.unit,
        designation: formData.designation.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-background to-blue-50 p-4">
        <Card className="w-full max-w-md border-green-500">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Registration Successful!</h2>
            <p className="text-muted-foreground">{result.message}</p>
            <div className="bg-muted p-4 rounded-lg text-left space-y-2 text-sm">
              <p><strong>Volunteer ID:</strong> <span className="font-mono text-orange-600">{result.volunteer.vid}</span></p>
              <p><strong>Name:</strong> {result.volunteer.fullName}</p>
              <p><strong>Phone:</strong> {result.volunteer.mobileNumber}</p>
              <p><strong>Gender:</strong> <span className="capitalize">{result.volunteer.gender}</span></p>
              <p><strong>Unit:</strong> {result.volunteer.unit}</p>
            </div>
            <p className="text-xs text-muted-foreground">Please save your Volunteer ID. You will need it for login and attendance.</p>
            <div className="flex gap-2 justify-center">
              <Link to="/login">
                <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Login</Button>
              </Link>
              <Button onClick={() => { setResult(null); setFormData({ firstName: "", lastName: "", email: "", mobileNumber: "", gender: "", unit: "", designation: "", notes: "" }); }}>
                <UserPlus className="h-4 w-4 mr-2" />Register Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
          <div className="w-16 h-16 bg-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Volunteer Registration</h1>
          <p className="text-muted-foreground mt-1">Register as a new volunteer for VKumbh Training</p>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" /> How Registration Works
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. Fill in your personal details below - all fields marked with * are required.</li>
              <li>2. A unique Volunteer ID (VID) will be generated automatically for you.</li>
              <li>3. Use your phone number and the OTP (demo: 123456) to log in.</li>
              <li>4. Your volunteer profile will be visible to instructors and administrators.</li>
            </ul>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-orange-500" />
              New Volunteer Registration
            </CardTitle>
            <CardDescription>
              Enter your details to register for the VKumbh volunteer training program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    className={cn(errors.firstName && "border-red-500")}
                  />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    className={cn(errors.lastName && "border-red-500")}
                  />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone Number *
                  </label>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formData.mobileNumber}
                    onChange={(e) => handleChange("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 15))}
                    className={cn(errors.mobileNumber && "border-red-500")}
                  />
                  {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email (Optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={cn(errors.email && "border-red-500")}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
              </div>

              {/* Gender & Unit Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Gender *</label>
                  <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger className={cn(errors.gender && "border-red-500")}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Unit Assignment *
                  </label>
                  <Select value={formData.unit} onValueChange={(v) => handleChange("unit", v)}>
                    <SelectTrigger className={cn(errors.unit && "border-red-500")}>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unit && <p className="text-xs text-red-500">{errors.unit}</p>}
                </div>
              </div>

              {/* Designation */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Designation (Optional)</label>
                <Input
                  placeholder="e.g., Team Lead, Medical Staff, Coordinator"
                  value={formData.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <StickyNote className="h-3 w-3" /> Additional Notes (Optional)
                </label>
                <Input
                  placeholder="Any special requirements, medical conditions, or notes..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 bg-orange-500 hover:bg-orange-500/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering...</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Complete Registration</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already registered? <Link to="/login" className="text-orange-600 hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}
