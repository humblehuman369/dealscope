import re
import pandas as pd
import numpy as np

def build_master_servicer_index(raw_df: pd.DataFrame) -> pd.DataFrame:
    df = raw_df.copy()

    # 1. Field Standardization & Normalization
    str_cols = df.select_dtypes(include="object").columns
    df[str_cols] = df[str_cols].apply(lambda x: x.str.strip())
    df.replace(to_replace=["", "N/A", "n/a", "None", "nan"], value=np.nan, inplace=True)

    def clean_nmls_raw(val):
        if pd.isna(val):
            return np.nan
        digits = re.sub(r"\D", "", str(val).split(".")[0])
        return digits if digits else np.nan

    df["NMLS_ID_Clean"] = df["NMLS_ID"].apply(clean_nmls_raw)

    # 2. Strict NMLS Validation Rule
    nmls_pattern = re.compile(r"^[1-9]\d{0,6}$")

    def validate_nmls(nmls_str):
        if pd.isna(nmls_str):
            return False, "Missing NMLS ID"
        if nmls_pattern.match(str(nmls_str)):
            return True, "Valid"
        return False, "Invalid Format/Length"

    validation_results = df["NMLS_ID_Clean"].apply(validate_nmls)
    df["Is_NMLS_Valid"] = [res[0] for res in validation_results]
    df["NMLS_Validation_Notes"] = [res[1] for res in validation_results]

    # 3. Fuzzy Normalized Name for Smart Deduplication
    def normalize_company_name(name):
        if pd.isna(name):
            return ""
        name = str(name).upper()
        suffixes = r"\b(LLC|INC|CORP|CORPORATION|BANK|NA|N\.A\.|LIMITED|CO|L\.P\.|LP|SERVICES)\b"
        name = re.sub(suffixes, "", name, flags=re.IGNORECASE)
        name = re.sub(r"[^\w\s]", "", name)
        return " ".join(name.split())

    df["Normalized_Name"] = df["Legal_Name"].apply(normalize_company_name)

    # 4. Smart Deduplication Strategy
    df["Completeness_Score"] = (
        df[["Legal_Name", "DBA", "HQ_Address", "FDIC_Cert", "SEC_CIK"]].notna().sum(axis=1)
    )

    df.sort_values(
        by=["Is_NMLS_Valid", "Completeness_Score"],
        ascending=[False, False],
        inplace=True
    )

    valid_nmls_mask = df["Is_NMLS_Valid"]
    df_valid = df[valid_nmls_mask].drop_duplicates(subset=["NMLS_ID_Clean"], keep="first")
    df_invalid = df[~valid_nmls_mask].drop_duplicates(subset=["Normalized_Name"], keep="first")

    dedup_df = pd.concat([df_valid, df_invalid], ignore_index=True)
    dedup_df.sort_values(by="Legal_Name", key=lambda col: col.str.lower(), inplace=True)
    dedup_df.reset_index(drop=True, inplace=True)

    # 5. Transform to Master Servicer Index Schema
    dedup_df["Internal_ID"] = [f"SRV-{i+1:04d}" for i in range(len(dedup_df))]
    dedup_df["NMLS_ID"] = dedup_df["NMLS_ID_Clean"].fillna("INVALID/MISSING")
    dedup_df["FDIC_Cert"] = dedup_df["FDIC_Cert"].fillna("N/A")
    dedup_df["SEC_CIK"] = dedup_df["SEC_CIK"].fillna("N/A")
    dedup_df["DBA"] = dedup_df["DBA"].fillna(dedup_df["Legal_Name"])

    master_schema_cols = [
        "Internal_ID",
        "Legal_Name",
        "DBA",
        "NMLS_ID",
        "FDIC_Cert",
        "SEC_CIK",
        "HQ_Address",
        "Servicing_Tier",
        "Is_NMLS_Valid",
        "NMLS_Validation_Notes"
    ]

    return dedup_df[master_schema_cols]

if __name__ == "__main__":
    raw_data = {
        "Legal_Name": [
            "Nationstar Mortgage LLC",
            "Nationstar Mortgage, LLC",
            "JPMorgan Chase Bank, N.A.",
            "PennyMac Loan Services LLC",
            "Unlicensed Servicer Corp"
        ],
        "DBA": [
            "Mr. Cooper",
            "Mr Cooper",
            "Chase",
            "PennyMac",
            np.nan
        ],
        "NMLS_ID": ["2119", "2119.0", "399798", "35953", "0000abc"],
        "FDIC_Cert": [np.nan, np.nan, "628", np.nan, np.nan],
        "SEC_CIK": ["0001549848", "0001549848", "0000019617", "0001568669", np.nan],
        "HQ_Address": [
            "8950 Cypress Waters Blvd, Dallas, TX 75019",
            np.nan,
            "1111 Polaris Pkwy, Columbus, OH 43240",
            "3043 Townsgate Rd, Westlake Village, CA 91361",
            "123 Main St, Anytown, USA"
        ],
        "Servicing_Tier": [
            "Tier 1 (Non-Bank)",
            "Tier 1 (Non-Bank)",
            "Tier 1 (Bank)",
            "Tier 1 (Non-Bank)",
            "Tier 3"
        ]
    }

    raw_df = pd.DataFrame(raw_data)
    print("--- RAW INTAKE DATASET ---")
    print(raw_df[["Legal_Name", "NMLS_ID", "HQ_Address"]])
    print("\n" + "="*80 + "\n")

    master_index_df = build_master_servicer_index(raw_df)
    print("--- DEDUPLICATED & VALIDATED MASTER SERVICER INDEX ---")
    print(master_index_df.to_string(index=False))
