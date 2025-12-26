# User Roles Analysis

Based on the database user list, here's a breakdown of users by role type:

## System Administrators
- `superadmin`
- `super_admin_1`
- `admin`
- `technical_admin`
- `techadmin`
- `tadmin`

## Regional Administrators
- `regional_admin`
- `regional_admin_north`
- `regional_admin_west`
- `regional_admin_south`
- `regional_admin_east`

## Regional Managers
- `regional_manager`

## Area Managers
- `area_manager`
- `area_manager_sa1` (South Area 1)
- `area_manager_sa2` (South Area 2)
- `area_manager_na1` (North Area 1)
- `area_manager_na2` (North Area 2)
- `area_manager_wa1` (West Area 1)
- `area_manager_wa2` (West Area 2)
- `area_manager_ea1` (East Area 1)
- `am_region1` (Area Manager Region 1)

## Territory Managers
- `tm_west` (Territory Manager West)
- `territory_manager_t1` through `territory_manager_t9`

## Finance Administrators
- `finance_ad1`
- `accounts_user`

## Dealer Admins
- `dealer1`
- `dealer2`
- `dealer3`
- `dealer1_admin`
- `d1_admin`
- `ajcbose_dealer`
- `dealer_admin_d001` through `dealer_admin_d009`

## Dealer Staff
- `dealer_staff`
- `ajcbose_dealer_staff`
- `staff_d001` through `staff_d009`

## System/Special Users
- `keyuser` (Key User)
- `inventory_user`

## Standard Role Names (from seed data)
Based on the system, the standard role names should be:
1. `super_admin`
2. `technical_admin`
3. `regional_admin`
4. `regional_manager`
5. `area_manager`
6. `territory_manager`
7. `finance_admin`
8. `dealer_admin`
9. `dealer_staff`
10. `inventory_user`
11. `accounts_user`

## Recommendations

1. **Username Standardization**: Some usernames don't follow a clear pattern. Consider standardizing:
   - Regional admins: `regional_admin_{region_name}`
   - Area managers: `area_manager_{region_code}_{area_code}`
   - Territory managers: `territory_manager_{territory_code}`
   - Dealer admins: `dealer_admin_{dealer_code}`
   - Dealer staff: `staff_{dealer_code}_{number}`

2. **Role Assignment Verification**: Ensure all users have proper `roleId` assignments matching their username patterns.

3. **Legacy Users**: Some users like `admin`, `superadmin` may need to be mapped to standard roles (`super_admin` or `technical_admin`).

4. **Test Users**: Users like `dealer1`, `dealer2`, `dealer3` may be test accounts that should be cleaned up or properly configured.

## Next Steps

Would you like me to:
1. Create a SQL query to verify role assignments for all users?
2. Generate a script to standardize usernames?
3. Create a user management report showing role assignments?
4. Check for any missing or incorrect role assignments?











