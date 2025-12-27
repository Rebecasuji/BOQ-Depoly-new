import { WallType } from "@/lib/constants";

// Constants for calculations
export const BRICK_FACE_AREA_FT2 = 0.08; // 1 brick = ~0.08 sq ft
export const BAG_VOLUME_FT3 = 1.25; // 1 bag cement = 1.25 cu ft
export const ROCKWOOL_BAG_COVER_SQFT = 70;

export interface ComputedMaterials {
  // Civil materials
  bricks?: number;
  cementBags?: number;
  sandCubicFt?: number;
  
  // Gypsum materials
  gypsumBoards?: number;
  rockwoolBags?: number;
  channels?: number;
  studs?: number;
  jointTape?: number;
  jointCompound?: number;
  
  // Plywood materials
  plywoodSheets?: number;
  aluminiumChannels?: number;
  laminateSheets?: number;
  
  // Glass partition materials
  glassArea?: number;
  
  area?: number;
}

export const computeRequired = (
  wallType: WallType | null,
  length: number | null,
  height: number | null,
  subOption: string | null,
  brickWastagePercent: number = 0
): ComputedMaterials => {
  if (!wallType || !length || !height) return {};

  const area = length * height;
  const wastageFactor = 1 + (brickWastagePercent / 100);

  if (wallType === "civil") {
    // Determine if 9 inch or 4.5 inch wall
    const is9Inch = subOption === "9 inch";
    const thickness = is9Inch ? 0.75 : 0.375; // in feet

    // Calculate volume
    const volume = area * thickness;

    // Brick calculation: 1 brick face area = 0.08 sq ft
    // For 9 inch (double layer): multiply by 2
    const baseBricks = area / BRICK_FACE_AREA_FT2;
    const bricks = is9Inch 
      ? Math.ceil(baseBricks * 2 * wastageFactor)
      : Math.ceil(baseBricks * wastageFactor);

    // Cement & Sand calculation
    // Mortar is 1:4 (cement:sand)
    // 1 cubic foot of mortar needs 0.2 cement bags + 0.8 sand
    const mortarVolume = volume;
    const cementBags = Math.ceil((mortarVolume / BAG_VOLUME_FT3) * wastageFactor);
    const sandCubicFt = Math.ceil(mortarVolume * 4 * wastageFactor);

    return {
      bricks,
      cementBags,
      sandCubicFt,
      area,
    };
  }

  if (wallType === "gypsum") {
    const isDouble = subOption?.toLowerCase().includes("double");
    const BOARD_AREA_SQFT = 24; // Standard gypsum board
    
    // Boards needed (both sides)
    const faces = 2;
    const layers = isDouble ? 2 : 1;
    const boardsNeeded = Math.ceil((area / BOARD_AREA_SQFT) * faces * layers);

    // Rockwool insulation
    const rockwoolBags = Math.ceil(area / ROCKWOOL_BAG_COVER_SQFT);

    // Channels and studs
    const channels = Math.ceil((length / 4.5) * 2); // Floor + ceiling channels
    const studs = Math.ceil((length / 2 + 1) * 2); // Studs on both sides

    // Joint tape and compound
    const jointTape = Math.ceil(boardsNeeded);
    const jointCompound = Math.ceil(boardsNeeded / 2);

    return {
      gypsumBoards: boardsNeeded,
      rockwoolBags,
      channels,
      studs,
      jointTape,
      jointCompound,
      area,
    };
  }

  if (wallType === "plywood") {
    const BOARD_AREA_SQFT = 32; // Standard plywood sheet
    
    // Plywood sheets needed (both sides)
    const plywoodSheets = Math.ceil((area / BOARD_AREA_SQFT) * 2);

    // Aluminium channels
    const aluminiumChannels = Math.ceil(length * 1.2);

    // Laminate (same as plywood)
    const laminateSheets = plywoodSheets;

    // Rockwool insulation
    const rockwoolBags = Math.ceil(area / ROCKWOOL_BAG_COVER_SQFT);

    return {
      plywoodSheets,
      aluminiumChannels,
      laminateSheets,
      rockwoolBags,
      area,
    };
  }

  if (wallType === "gypsum-glass") {
    const GLASS_AREA_PERCENT = 0.6; // 60% glass, 40% gypsum
    const BOARD_AREA_SQFT = 24; // Standard gypsum board
    const GLASS_SQFT_PER_PANEL = 10; // Average glass panel size
    
    // Gypsum for frame (40% of area)
    const gypsumBoards = Math.ceil((area * (1 - GLASS_AREA_PERCENT)) / BOARD_AREA_SQFT * 2);
    
    // Glass panels (60% of area, both sides)
    const glassArea = Math.ceil(area * GLASS_AREA_PERCENT * 2);
    
    // Aluminum frame (for glass panels)
    const aluminiumChannels = Math.ceil((length + height) * 2);
    
    return {
      gypsumBoards,
      glassArea,
      aluminiumChannels,
      area,
    };
  }

  if (wallType === "plywood-glass") {
    const GLASS_AREA_PERCENT = 0.5; // 50% glass, 50% plywood
    const BOARD_AREA_SQFT = 32; // Standard plywood sheet
    
    // Plywood for lower portion (50% of area, both sides)
    const plywoodSheets = Math.ceil((area * GLASS_AREA_PERCENT) / BOARD_AREA_SQFT * 2);
    
    // Glass panels (50% of area, both sides)
    const glassArea = Math.ceil(area * GLASS_AREA_PERCENT * 2);
    
    // Aluminum frame
    const aluminiumChannels = Math.ceil((length + height) * 2);
    
    return {
      plywoodSheets,
      glassArea,
      aluminiumChannels,
      area,
    };
  }

  return {};
};
