export interface CivilWallComputeResult {
  area: number;
  wallVolume: number;
  bricks: number;
  cementBags: number;
  sandCft: number;
  gypsumSheets: number;
  plywoodSheets: number;
  glassArea: number;
  framingLength: number;
  screws: number;
  jointCompound: number;
}

export const computeCivilWallRequired = (
  wallType: string | null,
  length: number | null,
  height: number | null,
  subOption: string | null,
  plywoodSelection: any = {}
): CivilWallComputeResult | null => {
  if (!wallType || !length || !height) return null;

  const area = length * height;
  let result: CivilWallComputeResult = {
    area,
    wallVolume: 0,
    bricks: 0,
    cementBags: 0,
    sandCft: 0,
    gypsumSheets: 0,
    plywoodSheets: 0,
    glassArea: 0,
    framingLength: 0,
    screws: 0,
    jointCompound: 0
  };

  if (wallType === "civil") {
    const thickness = subOption === "9 inch" ? 0.75 : 0.375;
    const volume = area * thickness;
    result.wallVolume = volume;

    if (subOption === "9 inch") {
        result.bricks = Math.ceil(area * 10);
        result.cementBags = Math.ceil((area / 100) * 1.5);
        result.sandCft = Math.ceil((area / 100) * 18);
    } else {
        result.bricks = Math.ceil(area * 5);
        result.cementBags = Math.ceil((area / 100) * 0.8);
        result.sandCft = Math.ceil((area / 100) * 10);
    }
  } 
  else if (wallType === "gypsum") {
    const sides = 2;
    result.gypsumSheets = Math.ceil((area * sides) / 24);
    const tracks = length * 2;
    const studs = (Math.ceil(length / 2) + 1) * height;
    result.framingLength = Math.ceil(tracks + studs);
    result.screws = result.gypsumSheets * 15;
    result.jointCompound = Math.ceil(result.gypsumSheets * 0.5);
  }
  else if (wallType === "plywood") {
    result.plywoodSheets = Math.ceil((area * 2) / 32);
    const tracks = length * 2;
    const studs = (Math.ceil(length / 2) + 1) * height;
    result.framingLength = Math.ceil(tracks + studs);
    result.screws = result.plywoodSheets * 20;
  }
  else if (wallType === "gypsum-glass" || wallType === "plywood-glass") {
    const solidArea = area * 0.5;
    const glassPart = area * 0.5;
    result.glassArea = glassPart;
    
    if (wallType.includes("gypsum")) {
        result.gypsumSheets = Math.ceil((solidArea * 2) / 24);
    } else {
        result.plywoodSheets = Math.ceil((solidArea * 2) / 32);
    }
    result.framingLength = Math.ceil((length * 2) + ((Math.ceil(length / 2) + 1) * height));
  }

  return result;
};
