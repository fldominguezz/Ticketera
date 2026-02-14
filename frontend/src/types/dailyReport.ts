export interface ToolHealth {
  health: string; // Allow free text but UI can suggest OK/DEGRADADO/CAIDO/MANTENIMIENTO
  obs?: string;
}

export interface LicenseConfig {
  ESET_SOC_LIC_MAX: number;
  ESET_SOC_MOBILE_LIC_MAX: number;
  ESET_BIENESTAR_LIC_MAX: number;
  EMS_LIC_MAX: number;
}

export interface DailyReportInput {
  date?: string; // YYYY-MM-DD
  shift: 'DIA' | 'NOCHE';
  
  // Licenses
  eset_soc_lic_usadas: number;
  eset_soc_mobile_usadas: number;
  eset_bienestar_lic_usadas: number;
  ems_lic_usadas: number;
  
  // Counters
  eset_bienestar_incidentes: string;
  edr_colectores_ws: string;
  edr_colectores_srv: string;
  bloqueo_srd: string;
  bloqueo_cfd: string;

  // Tools
  fortisiem: ToolHealth;
  fortisandbox: ToolHealth;
  forticlient_ems: ToolHealth;
  fortianalyzer: ToolHealth;
  fortiedr: ToolHealth;
  eset_soc: ToolHealth;
  eset_bienestar: ToolHealth;
  
  correo_obs?: string;
  novedades_generales: string[];
}

export interface DailyReport {
  id: string;
  date: string;
  shift: string;
  file_path: string;
  search_content?: string;
  created_at: string;
  created_by_id: string;
  report_data?: any;
}