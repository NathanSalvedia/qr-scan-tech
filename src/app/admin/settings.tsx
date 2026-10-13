import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SidebarNavigation } from '@/components/sidebar-navigation';
import { useAuth, authState } from '@/services/auth-state';
import {
  settingsService,
  DEFAULT_SYSTEM_SETTINGS,
} from '@/services/settings';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Admin Profile Form State
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('admin@multifactors.ph');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2. Organization Info State
  const [companyName, setCompanyName] = useState(DEFAULT_SYSTEM_SETTINGS.companyName);
  const [branchName, setBranchName] = useState(DEFAULT_SYSTEM_SETTINGS.branchName);
  const [officeAddress, setOfficeAddress] = useState(DEFAULT_SYSTEM_SETTINGS.officeAddress);
  const [hotline, setHotline] = useState(DEFAULT_SYSTEM_SETTINGS.hotline);
  const [mobileDispatch, setMobileDispatch] = useState(DEFAULT_SYSTEM_SETTINGS.mobileDispatch);

  // 3. QR Placard Defaults State
  const [placardHeader, setPlacardHeader] = useState(DEFAULT_SYSTEM_SETTINGS.placardHeader);
  const [paperFormat, setPaperFormat] = useState(DEFAULT_SYSTEM_SETTINGS.paperFormat);
  const [autoFillDuplicate, setAutoFillDuplicate] = useState(DEFAULT_SYSTEM_SETTINGS.autoFillDuplicate);
  const [tokenPrefix, setTokenPrefix] = useState(DEFAULT_SYSTEM_SETTINGS.tokenPrefix);

  const isWeb = Platform.OS === 'web';

  // Load dynamic data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicSettings() {
      setIsLoading(true);
      try {
        // 1. Fetch system settings from backend / cache
        const settings = await settingsService.getSystemSettings();
        if (isMounted && settings) {
          setCompanyName(settings.companyName || DEFAULT_SYSTEM_SETTINGS.companyName);
          setBranchName(settings.branchName || DEFAULT_SYSTEM_SETTINGS.branchName);
          setOfficeAddress(settings.officeAddress || DEFAULT_SYSTEM_SETTINGS.officeAddress);
          setHotline(settings.hotline || DEFAULT_SYSTEM_SETTINGS.hotline);
          setMobileDispatch(settings.mobileDispatch || DEFAULT_SYSTEM_SETTINGS.mobileDispatch);
          setPlacardHeader(settings.placardHeader || DEFAULT_SYSTEM_SETTINGS.placardHeader);
          setPaperFormat(settings.paperFormat || DEFAULT_SYSTEM_SETTINGS.paperFormat);
          setAutoFillDuplicate(settings.autoFillDuplicate ?? DEFAULT_SYSTEM_SETTINGS.autoFillDuplicate);
          setTokenPrefix(settings.tokenPrefix || DEFAULT_SYSTEM_SETTINGS.tokenPrefix);
        }

        // 2. Populate admin credentials from active session
        const activeUser = user || authState.getUser();
        if (isMounted && activeUser) {
          const displayName =
            activeUser.name ||
            `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() ||
            'Admin';
          setAdminName(displayName);
          if (activeUser.email) {
            setAdminEmail(activeUser.email);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load settings:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDynamicSettings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSaveSettings = async () => {
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    // Validation
    if (newPassword && !currentPassword) {
      const err = 'Current password is required to set a new password.';
      setErrorMessage(err);
      if (!isWeb) Alert.alert('Error', err);
      return;
    }

    if (newPassword && newPassword.length < 6) {
      const err = 'New password must be at least 6 characters.';
      setErrorMessage(err);
      if (!isWeb) Alert.alert('Error', err);
      return;
    }

    setIsSaving(true);

    try {
      // 1. Save System Settings to Backend & Cache
      const settingsResult = await settingsService.updateSystemSettings({
        companyName,
        branchName,
        officeAddress,
        hotline,
        mobileDispatch,
        placardHeader,
        paperFormat,
        autoFillDuplicate,
        tokenPrefix,
      });

      if (!settingsResult.success) {
        throw new Error(settingsResult.message || 'Failed to update system settings.');
      }

      // 2. Update Admin Profile & Password if changed or if new password provided
      const activeUser = user || authState.getUser();
      const currentDisplayName =
        activeUser?.name ||
        `${activeUser?.firstName || ''} ${activeUser?.lastName || ''}`.trim();

      const profileNeedsUpdate =
        adminName.trim() !== currentDisplayName ||
        adminEmail.trim().toLowerCase() !== activeUser?.email?.toLowerCase() ||
        Boolean(newPassword);

      if (profileNeedsUpdate) {
        const profileResult = await settingsService.updateAdminProfile({
          name: adminName.trim(),
          email: adminEmail.trim(),
          ...(newPassword ? { currentPassword, newPassword } : {}),
        });

        if (!profileResult.success) {
          throw new Error(profileResult.message || 'Failed to update administrator profile.');
        }

        // Clear password inputs on successful update
        setCurrentPassword('');
        setNewPassword('');
      }

      setSaveSuccessMessage('Settings and profile have been successfully saved to the server.');

      if (!isWeb) {
        Alert.alert(
          'Settings Saved',
          'Your system settings and company profile have been updated successfully.'
        );
      }

      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      const msg = err.message || 'An error occurred while saving settings.';
      setErrorMessage(msg);
      if (!isWeb) {
        Alert.alert('Save Failed', msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const confirmReset = () => {
      // Update UI state
      setCompanyName(DEFAULT_SYSTEM_SETTINGS.companyName);
      setBranchName(DEFAULT_SYSTEM_SETTINGS.branchName);
      setOfficeAddress(DEFAULT_SYSTEM_SETTINGS.officeAddress);
      setHotline(DEFAULT_SYSTEM_SETTINGS.hotline);
      setMobileDispatch(DEFAULT_SYSTEM_SETTINGS.mobileDispatch);
      setPlacardHeader(DEFAULT_SYSTEM_SETTINGS.placardHeader);
      setPaperFormat(DEFAULT_SYSTEM_SETTINGS.paperFormat);
      setAutoFillDuplicate(DEFAULT_SYSTEM_SETTINGS.autoFillDuplicate);
      setTokenPrefix(DEFAULT_SYSTEM_SETTINGS.tokenPrefix);
    };

    if (isWeb) {
      const confirmed = window.confirm(
        'Are you sure you want to restore all system preferences and placard defaults to factory values?'
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const res = await settingsService.resetSystemSettings();
      confirmReset();
      if (res.success) {
        setSaveSuccessMessage('System settings have been restored to defaults.');
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch {
      confirmReset();
      setSaveSuccessMessage('System settings restored to local defaults.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />

      <View className="flex-1 flex-row h-full">
        {/* Responsive Collapsible Sidebar */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/settings"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex"
          />
        )}

        {/* Main Settings Canvas */}
        <View className="flex-1 flex-col h-full overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={true}
            className="flex-1 p-4 md:p-6"
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {/* Top Page Header */}
            <View className="flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/80 gap-4 mb-6">
              <View>
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <Ionicons name="settings" size={20} color="#4d6029" />
                  </View>
                  <Text className="text-2xl font-poppins-bold text-[#0f172a]">
                    System Settings
                  </Text>
                </View>
                <Text className="text-xs font-poppins text-[#64748b] mt-1 ml-12">
                  Manage admin credentials, company contact information, and printed QR placard preferences.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center space-x-2.5">
                <TouchableOpacity
                  onPress={() => router.push('/admin/dashboard')}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                >
                  <Ionicons name="grid-outline" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    Dashboard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveSettings}
                  disabled={isSaving || isLoading}
                  className={`bg-[#4d6029] px-5 py-2.5 rounded-2xl flex-row items-center shadow-md shadow-[#4d6029]/25 ${
                    isSaving || isLoading ? 'opacity-70' : ''
                  }`}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  )}
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Banner */}
            {errorMessage && (
              <View className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex-row items-center justify-between mb-6 shadow-xs">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-rose-100 items-center justify-center mr-3">
                    <Ionicons name="alert-circle" size={18} color="#e11d48" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-rose-900">
                      Update Failed
                    </Text>
                    <Text className="text-[11px] font-poppins text-rose-700">
                      {errorMessage}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setErrorMessage(null)}>
                  <Ionicons name="close" size={18} color="#e11d48" />
                </TouchableOpacity>
              </View>
            )}

            {/* Success Toast Banner */}
            {saveSuccessMessage && (
              <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex-row items-center justify-between mb-6 shadow-xs">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                    <Ionicons name="checkmark-done" size={18} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-emerald-900">
                      Settings Saved Successfully
                    </Text>
                    <Text className="text-[11px] font-poppins text-emerald-700">
                      {saveSuccessMessage}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setSaveSuccessMessage(null)}>
                  <Ionicons name="close" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
            )}

            {isLoading ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color="#4d6029" />
                <Text className="text-xs font-poppins-medium text-[#64748b] mt-3">
                  Loading system configuration...
                </Text>
              </View>
            ) : (
              <View className="max-w-4xl w-full flex-col gap-6">
                {/* SECTION 1: ADMINISTRATOR PROFILE */}
                <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-2.5 border border-slate-200">
                        <Ionicons name="person" size={16} color="#0f172a" />
                      </View>
                      <View>
                        <Text className="text-sm font-poppins-bold text-[#0f172a]">
                          Administrator Account Profile
                        </Text>
                        <Text className="text-[11px] font-poppins text-[#64748b]">
                          Personal credentials for the network management console
                        </Text>
                      </View>
                    </View>

                    <View className="bg-[#4d6029]/10 px-3 py-1 rounded-full border border-[#4d6029]/20">
                      <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                        Super Admin · Full Access
                      </Text>
                    </View>
                  </View>

                  {/* Profile Form Fields */}
                  <View className="space-y-4">
                    {/* Name & Email Row */}
                    <View className="flex-col sm:flex-row gap-4 mb-4">
                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Full Name:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="person-outline" size={16} color="#64748b" />
                          <TextInput
                            value={adminName}
                            onChangeText={setAdminName}
                            placeholder="Admin"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-poppins-bold text-[#0f172a]"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Email Address:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="mail-outline" size={16} color="#64748b" />
                          <TextInput
                            value={adminEmail}
                            onChangeText={setAdminEmail}
                            placeholder="admin@multifactors.ph"
                            placeholderTextColor="#94a3b8"
                            keyboardType="email-address"
                            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Password Update Row */}
                    <View className="flex-col sm:flex-row gap-4">
                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Current Password:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="lock-closed-outline" size={16} color="#64748b" />
                          <TextInput
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Required to change password"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showPassword}
                            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          New Password (optional):
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="key-outline" size={16} color="#64748b" />
                          <TextInput
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Leave blank to keep current"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showPassword}
                            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                          />
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={16}
                              color="#94a3b8"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* SECTION 2: COMPANY & DISPATCH INFORMATION (Printed on QR Placards) */}
                <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5 border border-[#4d6029]/20">
                        <MaterialCommunityIcons name="office-building" size={16} color="#4d6029" />
                      </View>
                      <View>
                        <Text className="text-sm font-poppins-bold text-[#0f172a]">
                          Company &amp; Dispatch Information
                        </Text>
                        <Text className="text-[11px] font-poppins text-[#64748b]">
                          These details appear on printed 50x50mm stickers, A4 bondpaper placards, and field audit receipts.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Company Form Fields */}
                  <View className="space-y-4">
                    {/* Company Name & Branch */}
                    <View className="flex-col sm:flex-row gap-4 mb-4">
                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Company / Brand Name:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <MaterialCommunityIcons name="domain" size={16} color="#64748b" />
                          <TextInput
                            value={companyName}
                            onChangeText={setCompanyName}
                            placeholder="MultiFactors Network Infrastructure"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-poppins-bold text-[#0f172a]"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Operations Branch / Region:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="business-outline" size={16} color="#64748b" />
                          <TextInput
                            value={branchName}
                            onChangeText={setBranchName}
                            placeholder="Iligan City Operations"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Physical Street Address */}
                    <View className="mb-4">
                      <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                        Physical Office / Central Hub Address:
                      </Text>
                      <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                        <Ionicons name="location-outline" size={16} color="#64748b" />
                        <TextInput
                          value={officeAddress}
                          onChangeText={setOfficeAddress}
                          placeholder="Aguinaldo St, Poblacion, Iligan City, 9200"
                          placeholderTextColor="#94a3b8"
                          className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                        />
                      </View>
                    </View>

                    {/* 24/7 Hotline & Mobile Dispatch */}
                    <View className="flex-col sm:flex-row gap-4">
                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          24/7 NOC Technical Hotline (Printed on Placard):
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="call-outline" size={16} color="#4d6029" />
                          <TextInput
                            value={hotline}
                            onChangeText={setHotline}
                            placeholder="(063) 221-4400"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-poppins-bold text-[#0f172a]"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Field Dispatch Mobile Number:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="phone-portrait-outline" size={16} color="#64748b" />
                          <TextInput
                            value={mobileDispatch}
                            onChangeText={setMobileDispatch}
                            placeholder="+63 917 800 9000"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* SECTION 3: QR PLACARD & SYSTEM DEFAULTS */}
                <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center mr-2.5 border border-amber-200">
                        <MaterialCommunityIcons name="qrcode-scan" size={16} color="#d97706" />
                      </View>
                      <View>
                        <Text className="text-sm font-poppins-bold text-[#0f172a]">
                          QR Code &amp; A4 Placard Preferences
                        </Text>
                        <Text className="text-[11px] font-poppins text-[#64748b]">
                          Default formatting rules when generating printable bondpaper sheets
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* QR Form Fields */}
                  <View className="space-y-4">
                    {/* Placard Header & Paper Format */}
                    <View className="flex-col sm:flex-row gap-4 mb-4">
                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Default Placard Header Text:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <MaterialCommunityIcons name="format-title" size={16} color="#64748b" />
                          <TextInput
                            value={placardHeader}
                            onChangeText={setPlacardHeader}
                            placeholder="MULTIFACTORS · ILIGAN"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-poppins-bold text-[#0f172a]"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Default Paper Sizing:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="document-text-outline" size={16} color="#64748b" />
                          <TextInput
                            value={paperFormat}
                            onChangeText={setPaperFormat}
                            editable={false}
                            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#475569]"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Token Prefix & Duplicate Toggle */}
                    <View className="flex-col sm:flex-row items-center gap-4">
                      <View className="flex-1 w-full">
                        <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                          Security Token Key Prefix:
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                          <Ionicons name="key-outline" size={16} color="#64748b" />
                          <TextInput
                            value={tokenPrefix}
                            onChangeText={setTokenPrefix}
                            placeholder="QRTECH-BOX-"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 ml-2.5 text-xs font-mono font-bold text-[#4d6029]"
                          />
                        </View>
                      </View>

                      {/* Auto-fill duplicate switch */}
                      <TouchableOpacity
                        onPress={() => setAutoFillDuplicate(!autoFillDuplicate)}
                        className="flex-1 w-full flex-row items-center bg-slate-50 border border-slate-200 p-3 rounded-xl mt-6 sm:mt-6"
                      >
                        <Ionicons
                          name={autoFillDuplicate ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={autoFillDuplicate ? '#4d6029' : '#94a3b8'}
                        />
                        <View className="ml-2.5 flex-1">
                          <Text className="text-xs font-poppins-bold text-[#0f172a]">
                            Auto-fill duplicate placard
                          </Text>
                          <Text className="text-[10px] font-poppins text-[#64748b]">
                            Prints a backup copy on the bottom half for odd number selections
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* SAVE / RESET ACTIONS BAR */}
                <View className="flex-row items-center justify-between pt-2">
                  <TouchableOpacity
                    onPress={handleResetDefaults}
                    disabled={isSaving || isLoading}
                    className="bg-white border border-slate-200/80 px-5 py-3 rounded-2xl flex-row items-center shadow-xs"
                  >
                    <Ionicons name="refresh-outline" size={16} color="#64748b" />
                    <Text className="text-xs font-poppins-bold text-[#475569] ml-2">
                      Reset Defaults
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveSettings}
                    disabled={isSaving || isLoading}
                    className={`bg-[#4d6029] px-7 py-3 rounded-2xl flex-row items-center shadow-md shadow-[#4d6029]/25 ${
                      isSaving || isLoading ? 'opacity-70' : ''
                    }`}
                    activeOpacity={0.85}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                    ) : (
                      <Ionicons name="save-outline" size={18} color="#ffffff" />
                    )}
                    <Text className="text-xs font-poppins-bold text-white ml-2">
                      {isSaving ? 'Saving Changes...' : 'Save System Settings'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
