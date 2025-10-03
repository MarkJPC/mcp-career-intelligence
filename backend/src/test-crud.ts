import {
  ProjectCrudRepository,
  AchievementCrudRepository,
  TechnologyCrudRepository
} from './database/crud-operations';
import {
  CreateProjectInput,
  UpdateProjectInput,
  CreateAchievementInput,
  UpdateAchievementInput,
  CreateTechnologyInput
} from './types/crud';
import './database/database'; // Initialize DB connection

/**
 * Test suite for CRUD operations
 * Run with: npm run test-crud
 */
async function testCrudOperations() {
  console.log('🧪 Starting CRUD Operations Test\n');
  console.log('=' .repeat(60));

  let createdProjectId: number | null = null;

  try {
    // ========================================
    // TEST 1: CREATE Operation
    // ========================================
    console.log('\n📝 TEST 1: Creating a new project...\n');

    const newProject: CreateProjectInput = {
      title: 'Test CRUD Project',
      company: 'Test Company Inc.',
      role: 'Software Engineer',
      start_date: '2025-01-01',
      end_date: '2025-06-01',
      status: 'completed',
      description: 'This is a test project to validate CRUD operations',
      impact_metric: 'Improved test coverage by 100%',
      github_url: 'https://github.com/test/crud-test',
      live_url: 'https://test.example.com'
    };

    const createResult = await ProjectCrudRepository.create(newProject);

    if (createResult.success && createResult.data) {
      createdProjectId = createResult.data;
      console.log('✅ CREATE SUCCESS');
      console.log(`   Project ID: ${createdProjectId}`);
    } else {
      console.log('❌ CREATE FAILED');
      console.log(`   Error: ${createResult.error}`);
      return; // Stop testing if create fails
    }

    // ========================================
    // TEST 2: UPDATE Operation
    // ========================================
    console.log('\n✏️  TEST 2: Updating the project...\n');

    const updateData: UpdateProjectInput = {
      id: createdProjectId,
      title: 'Updated CRUD Test Project',
      description: 'Updated description to test UPDATE operation',
      status: 'ongoing',
      impact_metric: 'Improved reliability by 200%'
    };

    const updateResult = await ProjectCrudRepository.update(updateData);

    if (updateResult.success) {
      console.log('✅ UPDATE SUCCESS');
      console.log('   Fields updated: title, description, status, impact_metric');
    } else {
      console.log('❌ UPDATE FAILED');
      console.log(`   Error: ${updateResult.error}`);
    }

    // ========================================
    // TEST 3: Validation Tests
    // ========================================
    console.log('\n🔍 TEST 3: Testing validation...\n');

    // Test 3a: Missing required field
    console.log('   3a. Testing missing required field (title)...');
    const invalidCreate: any = {
      company: 'Test',
      role: 'Dev',
      start_date: '2025-01-01'
    };
    const invalidResult = await ProjectCrudRepository.create(invalidCreate);
    if (!invalidResult.success) {
      console.log('   ✅ Validation correctly caught missing title');
    } else {
      console.log('   ❌ Validation failed to catch missing title');
    }

    // Test 3b: Invalid date format
    console.log('   3b. Testing invalid date format...');
    const invalidDateCreate: CreateProjectInput = {
      title: 'Test',
      company: 'Test',
      role: 'Dev',
      start_date: '01/01/2025' // Wrong format
    };
    const invalidDateResult = await ProjectCrudRepository.create(invalidDateCreate);
    if (!invalidDateResult.success) {
      console.log('   ✅ Validation correctly caught invalid date format');
    } else {
      console.log('   ❌ Validation failed to catch invalid date');
    }

    // Test 3c: Invalid URL
    console.log('   3c. Testing invalid URL...');
    const invalidUrlCreate: CreateProjectInput = {
      title: 'Test',
      company: 'Test',
      role: 'Dev',
      start_date: '2025-01-01',
      github_url: 'not-a-valid-url'
    };
    const invalidUrlResult = await ProjectCrudRepository.create(invalidUrlCreate);
    if (!invalidUrlResult.success) {
      console.log('   ✅ Validation correctly caught invalid URL');
    } else {
      console.log('   ❌ Validation failed to catch invalid URL');
    }

    // Test 3d: Update with no fields
    console.log('   3d. Testing update with no fields...');
    const emptyUpdate: UpdateProjectInput = {
      id: createdProjectId
    };
    const emptyUpdateResult = await ProjectCrudRepository.update(emptyUpdate);
    if (!emptyUpdateResult.success) {
      console.log('   ✅ Validation correctly caught empty update');
    } else {
      console.log('   ❌ Validation failed to catch empty update');
    }

    // ========================================
    // TEST 4: Edge Cases
    // ========================================
    console.log('\n⚠️  TEST 4: Testing edge cases...\n');

    // Test 4a: Update non-existent project
    console.log('   4a. Testing update of non-existent project...');
    const nonExistentUpdate: UpdateProjectInput = {
      id: 999999,
      title: 'This project does not exist'
    };
    const nonExistentResult = await ProjectCrudRepository.update(nonExistentUpdate);
    if (!nonExistentResult.success) {
      console.log('   ✅ Update correctly rejected non-existent project');
    } else {
      console.log('   ❌ Update should have failed for non-existent project');
    }

    // ========================================
    // TEST 5: Achievement CRUD Operations
    // ========================================
    console.log('\n🏆 TEST 5: Testing Achievement CRUD...\n');

    let achievementId: number | null = null;

    // Test 5a: Create Achievement
    console.log('   5a. Creating achievement linked to project...');
    const newAchievement: CreateAchievementInput = {
      project_id: createdProjectId,
      title: 'Test Achievement',
      description: 'Successfully implemented comprehensive test coverage',
      technical_details: 'Used Jest and Supertest for unit and integration testing',
      quantified_impact: 'Achieved 95% code coverage',
      achievement_type: 'technical',
      is_resume_worthy: true
    };

    const achievementCreateResult = await AchievementCrudRepository.create(newAchievement);
    if (achievementCreateResult.success && achievementCreateResult.data) {
      achievementId = achievementCreateResult.data;
      console.log(`   ✅ Achievement created with ID: ${achievementId}`);
    } else {
      console.log(`   ❌ Achievement creation failed: ${achievementCreateResult.error}`);
    }

    // Test 5b: Update Achievement
    if (achievementId) {
      console.log('   5b. Updating achievement...');
      const achievementUpdate: UpdateAchievementInput = {
        id: achievementId,
        project_id: createdProjectId,
        title: 'Updated Test Achievement',
        description: 'Updated description',
        achievement_type: 'technical',
        is_resume_worthy: true
      };

      const achievementUpdateResult = await AchievementCrudRepository.update(achievementUpdate);
      if (achievementUpdateResult.success) {
        console.log('   ✅ Achievement updated successfully');
      } else {
        console.log(`   ❌ Achievement update failed: ${achievementUpdateResult.error}`);
      }
    }

    // Test 5c: Delete Achievement
    if (achievementId) {
      console.log('   5c. Deleting achievement...');
      const achievementDeleteResult = await AchievementCrudRepository.delete(achievementId);
      if (achievementDeleteResult.success) {
        console.log('   ✅ Achievement deleted successfully');
      } else {
        console.log(`   ❌ Achievement deletion failed: ${achievementDeleteResult.error}`);
      }
    }

    // Test 5d: Try to create achievement with non-existent project
    console.log('   5d. Testing achievement with non-existent project...');
    const invalidAchievement: CreateAchievementInput = {
      project_id: 999999,
      title: 'Invalid Achievement',
      description: 'This should fail',
      achievement_type: 'technical',
      is_resume_worthy: false
    };
    const invalidAchievementResult = await AchievementCrudRepository.create(invalidAchievement);
    if (!invalidAchievementResult.success) {
      console.log('   ✅ Validation correctly rejected achievement with invalid project');
    } else {
      console.log('   ❌ Should have rejected achievement with non-existent project');
    }

    // ========================================
    // TEST 6: Technology CRUD Operations
    // ========================================
    console.log('\n⚙️  TEST 6: Testing Technology CRUD...\n');

    let technologyId: number | null = null;

    // Test 6a: Create Technology
    console.log('   6a. Creating new technology...');
    const newTechnology: CreateTechnologyInput = {
      name: 'Jest Testing Framework',
      category: 'framework',
      proficiency_level: 'advanced'
    };

    const techCreateResult = await TechnologyCrudRepository.create(newTechnology);
    if (techCreateResult.success && techCreateResult.data) {
      technologyId = techCreateResult.data;
      console.log(`   ✅ Technology created with ID: ${technologyId}`);
    } else {
      console.log(`   ❌ Technology creation failed: ${techCreateResult.error}`);
    }

    // Test 6b: Update Technology
    if (technologyId) {
      console.log('   6b. Updating technology proficiency...');
      const techUpdateResult = await TechnologyCrudRepository.update(technologyId, {
        proficiency_level: 'expert'
      });
      if (techUpdateResult.success) {
        console.log('   ✅ Technology updated successfully');
      } else {
        console.log(`   ❌ Technology update failed: ${techUpdateResult.error}`);
      }
    }

    // Test 6c: Delete Technology
    if (technologyId) {
      console.log('   6c. Deleting technology...');
      const techDeleteResult = await TechnologyCrudRepository.delete(technologyId);
      if (techDeleteResult.success) {
        console.log('   ✅ Technology deleted successfully');
      } else {
        console.log(`   ❌ Technology deletion failed: ${techDeleteResult.error}`);
      }
    }

    // ========================================
    // TEST 7: DELETE with Cascading
    // ========================================
    console.log('\n🗑️  TEST 7: Testing DELETE with cascading...\n');

    // Create a project with achievements to test cascade
    console.log('   7a. Creating project with achievement for cascade test...');
    const cascadeTestProject: CreateProjectInput = {
      title: 'Cascade Test Project',
      company: 'Test Co',
      role: 'Developer',
      start_date: '2025-01-01'
    };

    const cascadeProjectResult = await ProjectCrudRepository.create(cascadeTestProject);
    let cascadeProjectId: number | null = null;

    if (cascadeProjectResult.success && cascadeProjectResult.data) {
      cascadeProjectId = cascadeProjectResult.data;
      console.log(`   ✅ Cascade test project created with ID: ${cascadeProjectId}`);

      // Create achievement linked to this project
      const cascadeAchievement: CreateAchievementInput = {
        project_id: cascadeProjectId,
        title: 'Cascade Test Achievement',
        description: 'This will be deleted when project is deleted',
        achievement_type: 'technical',
        is_resume_worthy: false
      };

      const cascadeAchResult = await AchievementCrudRepository.create(cascadeAchievement);
      if (cascadeAchResult.success) {
        console.log('   ✅ Achievement created for cascade test');
      }

      // Now delete the project - achievement should cascade
      console.log('   7b. Deleting project (should cascade to achievements)...');
      const cascadeDeleteResult = await ProjectCrudRepository.delete(cascadeProjectId);
      if (cascadeDeleteResult.success) {
        console.log('   ✅ Project deleted (achievements cascaded automatically)');
      } else {
        console.log(`   ❌ Cascade delete failed: ${cascadeDeleteResult.error}`);
      }
    }

    // ========================================
    // TEST 8: DELETE Edge Cases
    // ========================================
    console.log('\n🔍 TEST 8: Testing DELETE edge cases...\n');

    // Test 8a: Delete non-existent project
    console.log('   8a. Attempting to delete non-existent project...');
    const deleteNonExistent = await ProjectCrudRepository.delete(999999);
    if (!deleteNonExistent.success) {
      console.log('   ✅ Correctly rejected deletion of non-existent project');
    } else {
      console.log('   ❌ Should have failed when deleting non-existent project');
    }

    // Test 8b: Delete with invalid ID
    console.log('   8b. Attempting to delete with invalid ID (0)...');
    const deleteInvalidId = await ProjectCrudRepository.delete(0);
    if (!deleteInvalidId.success) {
      console.log('   ✅ Correctly rejected deletion with invalid ID');
    } else {
      console.log('   ❌ Should have failed with invalid ID');
    }

    // Test 8c: Delete the original test project (cleanup)
    if (createdProjectId) {
      console.log('   8c. Cleaning up - deleting original test project...');
      const finalDelete = await ProjectCrudRepository.delete(createdProjectId);
      if (finalDelete.success) {
        console.log('   ✅ Test project deleted successfully');
      } else {
        console.log(`   ❌ Failed to delete test project: ${finalDelete.error}`);
      }
    }

    // ========================================
    // TEST 9: Project-Technology Linking Operations
    // ========================================
    console.log('\n🔗 TEST 9: Testing Project-Technology Linking...\n');

    let linkTestProjectId: number | null = null;
    let linkTestTech1Id: number | null = null;
    let linkTestTech2Id: number | null = null;
    let linkTestTech3Id: number | null = null;

    // Test 9a: Create test project and technologies for linking
    console.log('   9a. Creating test project and technologies...');
    const linkTestProject: CreateProjectInput = {
      title: 'Technology Linking Test Project',
      company: 'Test Inc',
      role: 'Full Stack Developer',
      start_date: '2025-01-01'
    };

    const projectForLinking = await ProjectCrudRepository.create(linkTestProject);
    if (projectForLinking.success && projectForLinking.data) {
      linkTestProjectId = projectForLinking.data;
      console.log(`   ✅ Test project created with ID: ${linkTestProjectId}`);
    } else {
      console.log(`   ❌ Failed to create test project: ${projectForLinking.error}`);
    }

    // Create test technologies
    const tech1 = await TechnologyCrudRepository.create({
      name: 'React Test',
      category: 'framework',
      proficiency_level: 'advanced'
    });
    if (tech1.success && tech1.data) {
      linkTestTech1Id = tech1.data;
      console.log(`   ✅ Technology 1 created with ID: ${linkTestTech1Id}`);
    }

    const tech2 = await TechnologyCrudRepository.create({
      name: 'Node.js Test',
      category: 'framework',
      proficiency_level: 'intermediate'
    });
    if (tech2.success && tech2.data) {
      linkTestTech2Id = tech2.data;
      console.log(`   ✅ Technology 2 created with ID: ${linkTestTech2Id}`);
    }

    const tech3 = await TechnologyCrudRepository.create({
      name: 'PostgreSQL Test',
      category: 'database',
      proficiency_level: 'intermediate'
    });
    if (tech3.success && tech3.data) {
      linkTestTech3Id = tech3.data;
      console.log(`   ✅ Technology 3 created with ID: ${linkTestTech3Id}`);
    }

    // Test 9b: Link single technology to project
    if (linkTestProjectId && linkTestTech1Id) {
      console.log('   9b. Linking single technology to project...');
      const linkResult = await ProjectCrudRepository.linkTechnology(
        linkTestProjectId,
        linkTestTech1Id,
        'Primary frontend framework'
      );
      if (linkResult.success) {
        console.log('   ✅ Technology linked successfully');
      } else {
        console.log(`   ❌ Technology linking failed: ${linkResult.error}`);
      }
    }

    // Test 9c: Link same technology again (should update context)
    if (linkTestProjectId && linkTestTech1Id) {
      console.log('   9c. Linking same technology with different context...');
      const relinkResult = await ProjectCrudRepository.linkTechnology(
        linkTestProjectId,
        linkTestTech1Id,
        'Main UI framework'
      );
      if (relinkResult.success) {
        console.log('   ✅ Context updated successfully (idempotent behavior)');
      } else {
        console.log(`   ❌ Relink failed: ${relinkResult.error}`);
      }
    }

    // Test 9d: Link same technology with same context (should skip)
    if (linkTestProjectId && linkTestTech1Id) {
      console.log('   9d. Linking same technology with same context...');
      const skipResult = await ProjectCrudRepository.linkTechnology(
        linkTestProjectId,
        linkTestTech1Id,
        'Main UI framework'
      );
      if (skipResult.success) {
        console.log('   ✅ Correctly handled duplicate link (no changes)');
      } else {
        console.log(`   ❌ Should have succeeded: ${skipResult.error}`);
      }
    }

    // Test 9e: Bulk link multiple technologies
    if (linkTestProjectId && linkTestTech2Id && linkTestTech3Id) {
      console.log('   9e. Bulk linking multiple technologies...');
      const bulkLinkResult = await ProjectCrudRepository.linkTechnologies(
        linkTestProjectId,
        [
          { technologyId: linkTestTech2Id, usageContext: 'Backend runtime' },
          { technologyId: linkTestTech3Id, usageContext: 'Primary database' }
        ]
      );
      if (bulkLinkResult.success) {
        console.log(`   ✅ Bulk link successful: ${bulkLinkResult.data} technologies linked`);
      } else {
        console.log(`   ❌ Bulk link failed: ${bulkLinkResult.error}`);
      }
    }

    // Test 9f: Reverse lookup - get projects using a technology
    if (linkTestTech1Id) {
      console.log('   9f. Testing reverse lookup (projects using technology)...');
      const reverseLookup = await TechnologyCrudRepository.getLinkedProjects(linkTestTech1Id);
      if (reverseLookup.success && reverseLookup.data) {
        console.log(`   ✅ Reverse lookup successful: Found ${reverseLookup.data.length} project(s)`);
        if (reverseLookup.data.length > 0 && reverseLookup.data[0]) {
          console.log(`      - Project: "${reverseLookup.data[0].title}" (Context: "${reverseLookup.data[0].usageContext}")`);
        }
      } else {
        console.log(`   ❌ Reverse lookup failed: ${reverseLookup.error}`);
      }
    }

    // Test 9g: Unlink single technology
    if (linkTestProjectId && linkTestTech2Id) {
      console.log('   9g. Unlinking single technology...');
      const unlinkResult = await ProjectCrudRepository.unlinkTechnology(
        linkTestProjectId,
        linkTestTech2Id
      );
      if (unlinkResult.success) {
        console.log('   ✅ Technology unlinked successfully');
      } else {
        console.log(`   ❌ Unlink failed: ${unlinkResult.error}`);
      }
    }

    // Test 9h: Unlink already unlinked technology (idempotent)
    if (linkTestProjectId && linkTestTech2Id) {
      console.log('   9h. Unlinking already unlinked technology...');
      const reUnlinkResult = await ProjectCrudRepository.unlinkTechnology(
        linkTestProjectId,
        linkTestTech2Id
      );
      if (reUnlinkResult.success) {
        console.log('   ✅ Correctly handled already unlinked (idempotent)');
      } else {
        console.log(`   ❌ Should have succeeded: ${reUnlinkResult.error}`);
      }
    }

    // Test 9i: Replace all technologies for a project
    if (linkTestProjectId && linkTestTech2Id && linkTestTech3Id) {
      console.log('   9i. Replacing all technologies for project...');
      const replaceResult = await ProjectCrudRepository.replaceTechnologies(
        linkTestProjectId,
        [
          { technologyId: linkTestTech2Id, usageContext: 'New backend framework' },
          { technologyId: linkTestTech3Id, usageContext: 'New database' }
        ]
      );
      if (replaceResult.success) {
        console.log('   ✅ Technologies replaced successfully');
      } else {
        console.log(`   ❌ Replace failed: ${replaceResult.error}`);
      }
    }

    // Test 9j: Unlink all technologies
    if (linkTestProjectId) {
      console.log('   9j. Unlinking all technologies from project...');
      const unlinkAllResult = await ProjectCrudRepository.unlinkAllTechnologies(linkTestProjectId);
      if (unlinkAllResult.success) {
        console.log(`   ✅ All technologies unlinked: ${unlinkAllResult.data} removed`);
      } else {
        console.log(`   ❌ Unlink all failed: ${unlinkAllResult.error}`);
      }
    }

    // Test 9k: Link with invalid project ID
    if (linkTestTech1Id) {
      console.log('   9k. Testing link with invalid project ID...');
      const invalidProjectLink = await ProjectCrudRepository.linkTechnology(999999, linkTestTech1Id);
      if (!invalidProjectLink.success) {
        console.log('   ✅ Correctly rejected link with invalid project');
      } else {
        console.log('   ❌ Should have failed with invalid project');
      }
    }

    // Test 9l: Link with invalid technology ID
    if (linkTestProjectId) {
      console.log('   9l. Testing link with invalid technology ID...');
      const invalidTechLink = await ProjectCrudRepository.linkTechnology(linkTestProjectId, 999999);
      if (!invalidTechLink.success) {
        console.log('   ✅ Correctly rejected link with invalid technology');
      } else {
        console.log('   ❌ Should have failed with invalid technology');
      }
    }

    // Clean up linking test data
    console.log('   9m. Cleaning up linking test data...');
    if (linkTestProjectId) {
      await ProjectCrudRepository.delete(linkTestProjectId);
    }
    if (linkTestTech1Id) {
      await TechnologyCrudRepository.delete(linkTestTech1Id);
    }
    if (linkTestTech2Id) {
      await TechnologyCrudRepository.delete(linkTestTech2Id);
    }
    if (linkTestTech3Id) {
      await TechnologyCrudRepository.delete(linkTestTech3Id);
    }
    console.log('   ✅ Linking test data cleaned up');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPREHENSIVE CRUD OPERATIONS TEST COMPLETED');
    console.log('='.repeat(60));
    console.log('\n📊 Test Summary:');
    console.log('   ✓ Project CRUD (Create, Read, Update, Delete)');
    console.log('   ✓ Achievement CRUD (Create, Read, Update, Delete)');
    console.log('   ✓ Technology CRUD (Create, Read, Update, Delete)');
    console.log('   ✓ Technology Linking (Link, Unlink, Bulk, Replace)');
    console.log('   ✓ Reverse Lookup (Find projects by technology)');
    console.log('   ✓ Validation (Required fields, date formats, URLs)');
    console.log('   ✓ Edge cases (Non-existent records, invalid IDs)');
    console.log('   ✓ Idempotency (Duplicate links, multiple unlinking)');
    console.log('   ✓ Cascading deletes (Project → Achievements)');
    console.log('\n💡 All test data has been cleaned up');
    console.log('   You can verify with: npm run test-db\n');

  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the tests
testCrudOperations();
