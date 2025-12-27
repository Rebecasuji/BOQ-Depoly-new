[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. Implement login authentication with role-based access
[x] 4. Add material selection step to estimator
[x] 5. Update routing for role-based page access

## Completed Features:
- Added Material interface and materialsByType data to constants with technical specifications
- Created Step 4 in CivilWallEstimator for material selection with:
  - Material list on the left side with descriptions
  - Clickable info button to toggle details view
  - Sticky technical specifications panel on the right side showing:
    - Strength, Density, Fire Rating, Sound Insulation
    - Water Resistance, Durability, Cost, Installation Time
  - Materials available for Civil Wall, Gypsum, and Plywood wall types
- Updated step indicators from 4 to 5 steps total
- Made Calculate button disabled until material is selected