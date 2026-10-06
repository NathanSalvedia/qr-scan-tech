import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SidebarNavigation } from '@/components/sidebar-navigation';

export default function SettingsScreen() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 1. Admin Profile Form State
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('admin@multifactors.ph');
  const [currentPassword, setCurrentPassword] = useState('••••••••');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2. Organization Info State
  const [companyName, setCompanyName] = useState('MultiFactors Network Infrastructure');
  const [branchName, setBranchName] = useState('Iligan City Operations');
  const [officeAddress, setOfficeAddress] = useState('Aguinaldo St, Poblacion, Iligan City, 9200');
  const [hotline, setHotline] = useState('(063) 221-4400');
  const [mobileDispatch, setMobileDispatch] = useState('+63 917 800 9000');

  // 3. QR Placard Defaults State
  const [placardHeader, setPlacardHeader] = useState('MULTIFACTORS · ILIGAN');
  const [paperFormat, setPaperFormat] = useState('A4 Bondpaper (2 Placards / Sheet)');
  const [autoFillDuplicate, setAutoFillDuplicate] = useState(true);
  const [tokenPrefix, setTokenPrefix] = useState('QRTECH-BOX-');

  // Success Feedback
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  const isWeb = Platform.OS === 'web';

  const handleSaveSettings = () => {
    setSaveSuccessMessage(true);
    setTimeout(() => {
      setSaveSuccessMessage(false);
    }, 4000);

    if (!isWeb) {
      Alert.alert('Settings Saved', 'Your system settings and company profile have been updated.');
    }
  };

  const handleResetDefaults = () => {
    setAdminName('Admin');
    setAdminEmail('admin@multifactors.ph');
    setCompanyName('MultiFactors Network Infrastructure');
    setBranchName('Iligan City Operations');
    setOfficeAddress('Aguinaldo St, Poblacion, Iligan City, 9200');
    setHotline('(063) 221-4400');
    setMobileDispatch('+63 917 800 9000');
    setPlacardHeader('MULTIFACTORS · ILIGAN');
    setAutoFillDuplicate(true);
    setTokenPrefix('QRTECH-BOX-');
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
                  className="bg-[#4d6029] px-5 py-2.5 rounded-2xl flex-row items-center shadow-md shadow-[#4d6029]/25"
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Success Toast Banner */}
            {saveSuccessMessage && (
              <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex-row items-center justify-between mb-6 shadow-xs">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                    <Ionicons name="checkmark-done" size={18} color="#059669" />
                  </View>
                  <View>
                    <Text className="text-xs font-poppins-bold text-emerald-900">
                      Settings Saved Successfully
                    </Text>
                    <Text className="text-[11px] font-poppins text-emerald-700">
                      Administrator profile and company information have been updated.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setSaveSuccessMessage(false)}>
                  <Ionicons name="close" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
            )}

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
                  className="bg-white border border-slate-200/80 px-5 py-3 rounded-2xl flex-row items-center shadow-xs"
                >
                  <Ionicons name="refresh-outline" size={16} color="#64748b" />
                  <Text className="text-xs font-poppins-bold text-[#475569] ml-2">
                    Reset Defaults
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveSettings}
                  className="bg-[#4d6029] px-7 py-3 rounded-2xl flex-row items-center shadow-md shadow-[#4d6029]/25"
                  activeOpacity={0.85}
                >
                  <Ionicons name="save-outline" size={18} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-2">
                    Save System Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
