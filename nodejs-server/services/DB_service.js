const Scan = require('../models/scan');
const User = require('../models/user')
const Species = require('../models/species');
const Favourite = require('../models/favourite');
const TrackedPlant = require("../models/trackedPlant")
const mongoose = require('mongoose')
class DBService { // Db service holds functions for DB operations get/POST for users, scans, library, history, favourites



    // Users ===========================================================================
    async updateProfile(userId, updates){
        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updates },
                { new: true, runValidators: true }
            );
            return updatedUser;
        } catch (error) {
            throw new Error(`Failed to update user profile: ${error.message}`);
        }
    }

    async getUserDetails(userId) {
        console.log("Retrieving user account details for user ID: " + userId);
        try {    
            const userDetails = await User.findById(userId);
            
                return {
                    email: userDetails.email,
                    firstName: userDetails.firstName,
                    lastName:  userDetails.lastName,
                    photoUrl: userDetails.photoUrl
                }
            } catch (error) {
            throw new Error(`Failed to fetch user details: ${error.message}`);
        }
    }
    // Scans ===========================================================================

    
     async getAllScans(userId) {
       let updatedScans = [];
        try {
            const scans = await Scan.find({ user: userId }).sort({ scanTime: -1 });
            if (scans){
                scans.forEach(scan => {

                scan = {
                    scanId: scan._id,
                    disease: scan.disease,
                    confidence: scan.confidence,
                    imageUrl: scan.imageUrl,
                    remediations: scan.remediations
                }
                
                updatedScans.push(scan);
            });

            return updatedScans;
          }
        } catch (error) {
            throw new Error(`Failed to fetch scan: ${error.message}`);
        }
    }


    async getScanEntity(userId, scanId) {

        try {
            const scanEntity =  await Scan.findOne({ _id: scanId, user: userId }).sort({ createdAt: -1 })

            if (scanEntity) {
                const mappedScan = {
                    scanId: scanEntity._id,
                    plantName: scanEntity.plantName,
                    plantHealth: scanEntity.plantHealth,
                    disease: scanEntity.disease,
                    confidence: scanEntity.confidence,
                    imageUrl: scanEntity.imageUrl,
                    remediations: scanEntity.remediations
                }

                return mappedScan;
            }

            return null;

        } catch (error) {
            throw new Error(`Failed to fetch scan entry: ${error.message}`);
        }
    }

    // HISTORY aka SCANS ===========================================================================
    // save scan and get scanId
    async saveScan(userId,scanData,imageUrl) {
        
        const {disease, confidence, remediations, plantName, plantHealth} = scanData;
        
        const data = {
                user: userId,
                plantName,
                plantHealth,
                disease,
                confidence,
                remediations,
                imageUrl
            };
            try {
                const scan = new Scan(data);
                const scanId = await  scan.save();
                return scanId._id.toString();

            } catch (error) {
            throw new Error(`Failed to save scan entry: ${error.message}`);
            }
       }
    
    

    async deleteScan(scanId, userId) {
        const scan = await scan.findOne({ _id: scanId, user: userId });
    
        if (!scan) {
            return null;
        }
    
        // 3. Delete the database record
        return await scan.findOneAndDelete({ _id: plantId, user: userId });
    }

    
    // LIBRARY  ===========================================================================
    async getSpecies(page) {
        const ITEMS_PER_PAGE = 30;
        const DEFAULT_TOTAL_PLANTS = 416557;
        console.log("get species service")
 
        const currentPage = parseInt(page) || 1;
    
        try {
          const species = await Species.find()
            .skip((currentPage - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);
    
            const catalog = species.map(specie => ({
              speciesId: specie._id,
              scientific_name: specie.scientific_name,
              image_url: specie.image_url
            }));
          return {
            species:catalog,
            currentPage: currentPage,
            hasNextPage: ITEMS_PER_PAGE * currentPage < DEFAULT_TOTAL_PLANTS,
            hasPreviousPage: currentPage > 1,
            nextPage: currentPage + 1,
            previousPage: currentPage - 1,
            lastPage: Math.ceil(DEFAULT_TOTAL_PLANTS / ITEMS_PER_PAGE), //415667/20
          };
        } catch (error) {
          console.log(error);
          throw error;
        }
      }
    //  get specific plant 
       async getSpeciesEntity(id) {
        try {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid species ID format');
          }
          let species = await Species.findById(id);

          if (!species) {
            throw new Error('Species not found');
          } // return the doc as an object
        species = species.toObject();
          return {
            speciesId: species._id,
            ...species,
          };
        } catch (error) {
          console.error('Error fetching species by ID:', error);
          throw error;
        }
    }
    
    
    async saveToFavs (userId, speciesId){ //species = single plant, (SINGULAR OF SPECIES IS SPECIES....ENGLISH LESSON :)
       
            const species = await Species.findOne({_id:speciesId})
            if (!species) {
                    return null;
                }
                const favourite = new Favourite({
                    user: userId,
                    species: speciesId
                })
                const favouriteEntity = await favourite.save();
                if (favouriteEntity){
                    console.log("favourite entity returned")
                    return favouriteEntity;
                }
                return species;
         
        }

        async getAllFavs(userId) {
            const favourites = await Favourite.find({ user: userId })
              .sort({ createdAt: -1 })
              .populate('species', 'scientific_name image_url')
              .lean();
          
            const cleanedFavs = favourites.map(fav => ({
              speciesId: fav._id,
              species: fav.species, // already plain from lean() + populate
              // add user: fav.user if you want it
            }));
          
            return cleanedFavs;
          }
          

    // get single library favourite
    async getFavouriteEntity (specieId){
        try {
            const favEntity = await Favourite.findOne({ _id: specieId }).populate('species')
            let favouriteObj = favEntity.species.toObject()
        
            return {
                favouriteId: favEntity._id,
                ...favouriteObj
            };
  
        } catch (err) {
            return {
                message:"DBService error",
                errored_at:err}}
        }
    

// trac===========================================================================
async trackPlantSpecies(userId, scan) {
  try {
    // 1. Find a tracked plant for the user with the same plantName
    let trackedPlant = await TrackedPlant.findOne({
      user: userId,
      plantName: scan.plantName
    });

    if (trackedPlant) {
      // 2. Check if scanId is already in illnessHistory
      if (trackedPlant.illnessHistory.includes(scan.scanId)) {
        console.log("ScanId already exists for this plant, not adding.");
        return { isTracked: true };
      } else {
        // 3. Add scanId to illnessHistory and save and change image  
        trackedPlant.illnessHistory.push(scan.scanId);
        trackedPlant.imageUrl = scan.imageUrl;
        trackedPlant.plantHealth = scan.plantHealth;
        await trackedPlant.save();
        console.log("Added new scanId to existing tracked plant.");
        return trackedPlant;
      }
    } else {
      const newTrackedPlant = new TrackedPlant({
        user: userId,
        plantName: scan.plantName,
        illnessHistory: [scan.scanId],
        imageUrl: scan.imageUrl,
        plantHealth: scan.plantHealth

      });
      await newTrackedPlant.save();
      console.log("Created new tracked plant.");
      return newTrackedPlant;
    }
  } catch (err) {
    return {
      success: false,
      message: "DBService error",
      error: { message: err.message }
    };
  }
}
 async getAllTrackedPlants(userId){
   
        const trackedPlants =  await TrackedPlant.find({user:userId}).sort({ lastUpdated: -1 })
        .populate('illnessHistory', '_id',).lean()

        const mappedTrackedPlants = trackedPlants.map(trackedPlant => ({
            
          trackedPlantId: trackedPlant._id,
            plantName: trackedPlant.plantName,
            plantHealth: trackedPlant.plantHealth,
            imageUrl: trackedPlant.imageUrl,
        }));

        return mappedTrackedPlants;
    }
   async getTrackedPlant(userId, trackedPlantId){
        try {
            const trackedPlant = await TrackedPlant
            .findOne({ _id: trackedPlantId, user: userId })
            .populate('illnessHistory', 
              '_id disease confidence remediations scanTime')
              const cleanedIllnessHistory =  trackedPlant.illnessHistory.map(illness => ({
                scanId: illness._id,// add as button
                imageUrl: illness.imageUrl,
                disease: illness.disease,
                confidence: illness.confidence,
                // remediations: illness.remediations, // too large to send
                scanTime: illness.scanTime 
              }));

            const cleanedTrackedPlant = {
                trackedPlantId: trackedPlant._id,
                plantName: trackedPlant.plantName,
                plantHealth: trackedPlant.plantHealth,
                imageUrl: trackedPlant.imageUrl,
                illnessHistory:cleanedIllnessHistory
            }
            return cleanedTrackedPlant;
        } catch (err) {
            return {
                message: "DBService error",
                error: {
                  message: err.message
                }
            };
        }
    }

  async deleteTrackedPlant(userId, trackedPlantId) {
    try {
      const trackedPlant = await TrackedPlant.findOneAndDelete({ _id: trackedPlantId, user: userId });
      if (!trackedPlant) {
        return {
          success: false,
          message: "Tracked plant not found"
        };
      }
      return {
        success: true,
        message: "Successfully deleted tracked plant"
      };
    } catch (err) {
      return {
        success: false,
        message: "DBService error",
        error: {
          message: err.message
        }
      };
    }
  }
 
}


module.exports = new DBService();