from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta, timezone
from bson import ObjectId

from ..db.mongodb import db
from ..models.loop import FrequencyType

async def calculate_streaks(loop_id: str) -> Dict[str, Any]:
    """
    Calculate the current and longest streaks for a loop.

    This is the core logic for streak calculation based on the loop's frequency type.
    """
    # Get the loop
    loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
    if not loop:
        raise ValueError(f"Loop with ID {loop_id} not found")

    # Get all completions for this loop, sorted by date
    try:
        completions = await db.db.completions.find(
            {"loop_id": ObjectId(loop_id)}
        ).sort("completion_date", 1).to_list(length=1000)
    except Exception as e:
        print(f"Error fetching completions: {e}")
        completions = []

    print(f"Found {len(completions)} completions for loop {loop_id}")
    if completions:
        print(f"First completion: {completions[0]}")

    # Extract completion dates and convert from string to date if needed
    completion_dates = []
    for c in completions:
        try:
            if isinstance(c["completion_date"], str):
                completion_date = date.fromisoformat(c["completion_date"])
                completion_dates.append(completion_date)
                print(f"Converted string date: {c['completion_date']} to {completion_date}")
            else:
                completion_dates.append(c["completion_date"])
                print(f"Using date object directly: {c['completion_date']}")
        except Exception as e:
            print(f"Error processing completion date: {e}, completion: {c}")

    print(f"Extracted {len(completion_dates)} valid completion dates")

    # Calculate streaks based on frequency type
    current_streak = 0
    longest_streak = 0

    # Convert start_date from string to date if needed
    start_date = loop["start_date"]
    if isinstance(start_date, str):
        start_date = date.fromisoformat(start_date)

    if loop["frequency_type"] == FrequencyType.DAILY:
        current_streak, longest_streak = calculate_daily_streaks(
            completion_dates, start_date
        )

    elif loop["frequency_type"] == FrequencyType.SPECIFIC_DAYS:
        current_streak, longest_streak = calculate_specific_days_streaks(
            completion_dates, start_date, loop["frequency_details"]["days"]
        )

    elif loop["frequency_type"] == FrequencyType.EVERY_N_DAYS:
        current_streak, longest_streak = calculate_every_n_days_streaks(
            completion_dates, start_date, loop["frequency_details"]["n"]
        )

    elif loop["frequency_type"] == FrequencyType.X_TIMES_PER_WEEK:
        current_streak, longest_streak = calculate_x_times_per_week_streaks(
            completion_dates, start_date, loop["frequency_details"]["count"]
        )

    # Get the current values from the loop
    current_longest_streak = loop.get("longest_streak", 0)

    # Calculate the new longest streak
    new_longest_streak = max(longest_streak, current_longest_streak)

    print(f"Updating loop {loop_id} with current_streak={current_streak}, longest_streak={new_longest_streak}")
    print(f"Previous values: current_streak={loop.get('current_streak', 0)}, longest_streak={current_longest_streak}")

    # Update the loop with the new streak values
    update_result = await db.db.loops.update_one(
        {"_id": ObjectId(loop_id)},
        {
            "$set": {
                "current_streak": current_streak,
                "longest_streak": new_longest_streak,
                "last_streak_update_check": datetime.now(timezone.utc)
            }
        }
    )

    print(f"Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")

    # Return the updated loop
    updated_loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
    print(f"Updated loop: current_streak={updated_loop.get('current_streak')}, longest_streak={updated_loop.get('longest_streak')}")
    return updated_loop

def calculate_daily_streaks(
    completion_dates: List[date],
    start_date: date
) -> tuple[int, int]:
    """
    Calculate streaks for daily frequency.
    """
    if not completion_dates:
        print("No completion dates, returning 0, 0")
        return 0, 0

    # Sort dates
    completion_dates = sorted(completion_dates)
    print(f"Sorted completion dates: {completion_dates}")

    # Calculate longest streak
    longest_streak = 1
    current_streak_for_longest = 1

    for i in range(1, len(completion_dates)):
        days_diff = (completion_dates[i] - completion_dates[i-1]).days
        print(f"Days difference between {completion_dates[i]} and {completion_dates[i-1]}: {days_diff}")

        # Check if consecutive days
        if days_diff == 1:
            current_streak_for_longest += 1
            print(f"Consecutive days found, current_streak_for_longest: {current_streak_for_longest}")
        else:
            # Reset streak if gap
            print(f"Gap found ({days_diff} days), resetting streak")
            current_streak_for_longest = 1

        longest_streak = max(longest_streak, current_streak_for_longest)
        print(f"Updated longest_streak: {longest_streak}")

    # Calculate current streak (must end today or yesterday)
    today = date.today()
    yesterday = today - timedelta(days=1)

    print(f"Today: {today}, Yesterday: {yesterday}, Most recent completion: {completion_dates[-1]}")

    # If the most recent completion is not today or yesterday, current streak is 0
    if completion_dates[-1] < yesterday:
        print(f"Most recent completion ({completion_dates[-1]}) is before yesterday, current streak is 0")
        current_streak = 0
    else:
        # Count backwards from the most recent completion
        current_streak = 1
        print(f"Starting current streak calculation from most recent date: {completion_dates[-1]}")

        for i in range(len(completion_dates) - 2, -1, -1):
            days_diff = (completion_dates[i+1] - completion_dates[i]).days
            print(f"Days difference between {completion_dates[i+1]} and {completion_dates[i]}: {days_diff}")

            if days_diff == 1:
                current_streak += 1
                print(f"Consecutive days found, current_streak: {current_streak}")
            else:
                print(f"Gap found ({days_diff} days), stopping current streak calculation")
                break

    print(f"Final current_streak: {current_streak}, longest_streak: {longest_streak}")
    return current_streak, longest_streak

def calculate_specific_days_streaks(
    completion_dates: List[date],
    start_date: date,
    days_of_week: List[int]
) -> tuple[int, int]:
    """
    Calculate streaks for specific days of the week.
    """
    if not completion_dates or not days_of_week:
        return 0, 0

    # Group completions by week
    weeks_completions = {}
    for d in completion_dates:
        # Get the week start (Sunday)
        week_start = d - timedelta(days=d.weekday() + 1 if d.weekday() < 6 else 0)
        if week_start not in weeks_completions:
            weeks_completions[week_start] = []
        weeks_completions[week_start].append(d.weekday() if d.weekday() < 6 else -1)

    # Check which weeks have all required days completed
    completed_weeks = []
    for week_start, completed_days in weeks_completions.items():
        # Convert days_of_week to weekday format (0=Monday, 6=Sunday)
        required_days = [(d - 1) % 7 for d in days_of_week]  # Convert 0=Sunday to 0=Monday format
        if all(day in completed_days for day in required_days):
            completed_weeks.append(week_start)

    # Sort completed weeks
    completed_weeks.sort()

    # Calculate longest streak
    longest_streak = 0
    current_streak = 0

    for i in range(len(completed_weeks)):
        if i == 0 or (completed_weeks[i] - completed_weeks[i-1]).days == 7:
            current_streak += 1
        else:
            current_streak = 1

        longest_streak = max(longest_streak, current_streak)

    # Calculate current streak
    today = date.today()
    this_week_start = today - timedelta(days=today.weekday() + 1 if today.weekday() < 6 else 0)
    last_week_start = this_week_start - timedelta(days=7)

    # Check if current or last week is complete
    if completed_weeks and completed_weeks[-1] >= last_week_start:
        # Count backwards from the most recent completed week
        current_streak = 1
        for i in range(len(completed_weeks) - 2, -1, -1):
            if (completed_weeks[i+1] - completed_weeks[i]).days == 7:
                current_streak += 1
            else:
                break
    else:
        current_streak = 0

    return current_streak, longest_streak

def calculate_every_n_days_streaks(
    completion_dates: List[date],
    start_date: date,
    n: int
) -> tuple[int, int]:
    """
    Calculate streaks for every N days frequency.
    """
    if not completion_dates:
        return 0, 0

    # Generate expected dates
    today = date.today()
    expected_dates = []
    current_date = start_date

    while current_date <= today:
        expected_dates.append(current_date)
        current_date += timedelta(days=n)

    # Check which expected dates have completions
    completion_set = set(completion_dates)
    completed_expected = [d for d in expected_dates if d in completion_set]

    # Calculate longest streak
    longest_streak = 0
    current_streak = 0

    for i in range(len(completed_expected)):
        if i == 0 or (completed_expected[i] - completed_expected[i-1]).days == n:
            current_streak += 1
        else:
            current_streak = 1

        longest_streak = max(longest_streak, current_streak)

    # Calculate current streak
    if not completed_expected:
        current_streak = 0
    else:
        # Get the most recent expected date
        most_recent_expected = expected_dates[-1]

        # If the most recent expected date is not completed, current streak is 0
        if most_recent_expected not in completion_set:
            current_streak = 0
        else:
            # Count backwards from the most recent completion
            current_streak = 1
            for i in range(len(completed_expected) - 2, -1, -1):
                if (completed_expected[i+1] - completed_expected[i]).days == n:
                    current_streak += 1
                else:
                    break

    return current_streak, longest_streak

def calculate_x_times_per_week_streaks(
    completion_dates: List[date],
    start_date: date,
    count: int
) -> tuple[int, int]:
    """
    Calculate streaks for X times per week frequency.
    """
    if not completion_dates:
        return 0, 0

    # Group completions by week
    weeks_completions = {}
    for d in completion_dates:
        # Get the week start (Sunday)
        week_start = d - timedelta(days=d.weekday() + 1 if d.weekday() < 6 else 0)
        if week_start not in weeks_completions:
            weeks_completions[week_start] = set()
        weeks_completions[week_start].add(d)

    # Check which weeks have at least 'count' completions on distinct days
    completed_weeks = []
    for week_start, days in weeks_completions.items():
        if len(days) >= count:
            completed_weeks.append(week_start)

    # Sort completed weeks
    completed_weeks.sort()

    # Calculate longest streak
    longest_streak = 0
    current_streak = 0

    for i in range(len(completed_weeks)):
        if i == 0 or (completed_weeks[i] - completed_weeks[i-1]).days == 7:
            current_streak += 1
        else:
            current_streak = 1

        longest_streak = max(longest_streak, current_streak)

    # Calculate current streak
    today = date.today()
    this_week_start = today - timedelta(days=today.weekday() + 1 if today.weekday() < 6 else 0)
    last_week_start = this_week_start - timedelta(days=7)

    # Check if current or last week is complete
    if completed_weeks and completed_weeks[-1] >= last_week_start:
        # Count backwards from the most recent completed week
        current_streak = 1
        for i in range(len(completed_weeks) - 2, -1, -1):
            if (completed_weeks[i+1] - completed_weeks[i]).days == 7:
                current_streak += 1
            else:
                break
    else:
        current_streak = 0

    return current_streak, longest_streak
